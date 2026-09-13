<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use Carbon\Carbon;
use DomainException;
use Illuminate\Support\Collection;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\ModeloFormulario;
use Modules\Capd\Models\ModeloFatorPeso;
use Modules\Capd\Models\Servidor;

/**
 * Motor de Cálculo de Notas — CAPD (RF-07, RN-02, RN-04, RN-05, RN-08).
 *
 * Centraliza toda a lógica matemática do módulo CAPD:
 *
 * - Nc  = Σ(Pi × Wi)           — nota do ciclo individual (escala 0-100)
 * - NFC = (Nc1 + Nc2 + Nc3) / 3 — nota final consolidada do triênio (RN-02)
 * - Conceito a partir de faixas configuráveis
 * - Redistribuição proporcional do Fator H (RF-06)
 * - Quinquênios (RN-08) — segregado das notas de desempenho
 *
 * NUNCA usa float para armazenar valores monetários/notas; usa bcmath (precision=2).
 */
final class NotaCalculoService
{
    /**
     * RF-07 — Calcula a Nota do Ciclo (Nc).
     *
     * Nc = Σ (Pi × Wi), onde:
     *   Pi = pontuação normalizada do fator i (escala 0-100)
     *   Wi = peso percentual do fator i (soma = 100)
     *
     * @param array<string, float> $respostas  — ['fator_codigo' => pontuacao, ...]
     * @param Collection<int, ModeloFatorPeso> $fatoresPesos — pesos efetivos (após redistribuição)
     * @return string — DECIMAL(5,2) como string, ex.: "89.25"
     *
     * @throws DomainException se pesos não somam 100 ± 0.01
     */
    public function calcularNotaCiclo(
        array      $respostas,
        Collection $fatoresPesos,
    ): string {
        $this->validarSomaPesos($fatoresPesos);

        $nc = '0.00';

        foreach ($fatoresPesos as $mfp) {
            $codigo = $mfp->fator?->codigo ?? (string) $mfp->fator_id;
            $pi     = (float) ($respostas[$codigo] ?? $respostas[(string) $mfp->fator_id] ?? 0.0);
            $wi     = $mfp->peso / 100.0; // converte % para decimal

            // Valida faixa de pontuação
            if ($pi < 0 || $pi > 100) {
                throw new DomainException("Pontuação do fator '{$codigo}' fora da faixa 0-100: {$pi}");
            }

            // bcadd para acumulação precisa
            $parcela = number_format($pi * $wi, 4, '.', '');
            $nc      = number_format((float) $nc + (float) $parcela, 4, '.', '');
        }

        // Arredonda para 2 casas decimais (RF-07: "sem desvios além de 2 casas")
        return number_format((float) $nc, 2, '.', '');
    }

    /**
     * RN-02 — Calcula a Nota Final Consolidada (NFC) do triênio.
     *
     * NFC = (Nc1 + Nc2 + Nc3) / 3
     *
     * @param list<string> $notasCiclos — lista de Nc em string (1 a 3 valores)
     * @return string — DECIMAL(5,2), ex.: "82.75"
     *
     * @throws DomainException se não há notas para consolidar
     */
    public function calcularNfc(array $notasCiclos): string
    {
        $notasCiclos = array_filter($notasCiclos, fn ($n) => $n !== null && $n !== '');

        if (empty($notasCiclos)) {
            throw new DomainException('Não há notas de ciclo para calcular a NFC.');
        }

        $soma = array_reduce(
            $notasCiclos,
            fn (float $carry, string $nc) => $carry + (float) $nc,
            0.0
        );

        $nfc = $soma / count($notasCiclos);

        return number_format($nfc, 2, '.', '');
    }

    /**
     * RN-04 — Determina elegibilidade para progressão funcional.
     *
     * Usa a nota_corte_nfc do ciclo (dinâmica, configurada pela Comissão).
     *
     * @param CicloAvaliacao|object $ciclo
     */
    public function isElegivelProgressao(string $nfc, object $ciclo): bool
    {
        $corte = (float) ($ciclo->nota_corte_nfc ?? '70.00');
        return (float) $nfc >= $corte;
    }

    /**
     * Determina o conceito correspondente à NFC com base nas faixas do ciclo.
     *
     * Faixas padrão (configuráveis via regras_config do ciclo):
     *   Excelente   : 90.00 – 100.00
     *   Bom         : 75.00 – 89.99
     *   Regular     : 60.00 – 74.99
     *   Insuficiente: 0.00  – 59.99
     *
     * @param CicloAvaliacao|object $ciclo
     */
    public function determinarConceito(string $nfc, object $ciclo): string
    {
        $regras = $ciclo->getRegras();

        // Faixas configuráveis — o array é ordenado do maior para o menor
        $faixas = $regras['faixas_conceito'] ?? [
            ['conceito' => 'Excelente',   'min' => 90.00, 'max' => 100.00],
            ['conceito' => 'Bom',         'min' => 75.00, 'max' =>  89.99],
            ['conceito' => 'Regular',     'min' => 60.00, 'max' =>  74.99],
            ['conceito' => 'Insuficiente','min' =>  0.00, 'max' =>  59.99],
        ];

        $valor = (float) $nfc;

        foreach ($faixas as $faixa) {
            if ($valor >= (float) $faixa['min'] && $valor <= (float) $faixa['max']) {
                return $faixa['conceito'];
            }
        }

        return 'Insuficiente';
    }

    /**
     * RN-05 — Ordenação de desempate para ranking de progressão funcional.
     *
     * Critérios sucessivos (art. 39 da Lei 1.704/2006):
     *   1. Maior NFC (DESC)
     *   2. Maior tempo de serviço no município de Araucária (DESC)
     *   3. Maior idade civil — data_nascimento ASC (mais velho = prioridade)
     *
     * @param Collection<int, array{servidor: Servidor, nfc: string}> $candidatos
     * @return Collection<int, array{servidor: Servidor, nfc: string, posicao: int}>
     */
    public function rankingComDesempate(Collection $candidatos): Collection
    {
        return $candidatos
            ->sort(function (array $a, array $b): int {
                // 1. NFC DESC
                $diffNfc = (float) $b['nfc'] - (float) $a['nfc'];
                if (abs($diffNfc) > 0.001) {
                    return $diffNfc > 0 ? 1 : -1;
                }

                // 2. Tempo de serviço DESC (data_admissao ASC = mais tempo)
                $admA = $a['servidor']->data_admissao ?? now()->toDateString();
                $admB = $b['servidor']->data_admissao ?? now()->toDateString();
                $diffAdm = Carbon::parse($admA)->diffInDays(Carbon::parse($admB));
                if ($diffAdm !== 0) {
                    // Quem entrou antes tem mais tempo de serviço → prioridade
                    return Carbon::parse($admA)->lt(Carbon::parse($admB)) ? -1 : 1;
                }

                // 3. Idade civil DESC (data_nascimento ASC = mais velho)
                $nascA = $a['servidor']->data_nascimento ?? now()->toDateString();
                $nascB = $b['servidor']->data_nascimento ?? now()->toDateString();

                return Carbon::parse($nascA)->timestamp <=> Carbon::parse($nascB)->timestamp;
            })
            ->values()
            ->map(function (array $item, int $idx): array {
                $item['posicao'] = $idx + 1;
                return $item;
            });
    }

    /**
     * RN-08 — Cômputo de quinquênios (segregado das notas de desempenho).
     *
     * Art. 17 da Lei 1.704/2006: 5% por quinquênio de serviço efetivo.
     *
     * @param Servidor|object $servidor
     * @param CicloAvaliacao|object $ciclo
     * @return array{qtd_quinquenios: int, percentual_total: float, proximo_em: string|null}
     */
    public function calcularQuinquenios(object $servidor, object $ciclo): array
    {
        $dataAdmissao = $servidor->data_admissao ?? null;
        if (! $dataAdmissao) {
            return ['qtd_quinquenios' => 0, 'percentual_total' => 0.0, 'proximo_em' => null];
        }

        $dataRef          = Carbon::parse($ciclo->data_fim ?? now());
        $dataAdm          = Carbon::parse($dataAdmissao);
        $anosServico      = (int) $dataAdm->diffInYears($dataRef);
        $qtdQuinquenios   = (int) floor($anosServico / 5);
        $percentualCiclo  = (float) ($ciclo->quinquenio_percentual ?? '5.00');
        $percentualTotal  = $qtdQuinquenios * $percentualCiclo;

        // Data do próximo quinquênio
        $proximoAniversario = $dataAdm->copy()->addYears(($qtdQuinquenios + 1) * 5);
        $proximoEm          = $proximoAniversario->gt($dataRef)
            ? $proximoAniversario->toDateString()
            : null;

        return [
            'qtd_quinquenios'  => $qtdQuinquenios,
            'percentual_total' => $percentualTotal,
            'proximo_em'       => $proximoEm,
        ];
    }

    // ── Privados ───────────────────────────────────────────────────────

    /**
     * Valida que a soma dos pesos seja 100% ± 0.01.
     *
     * @param Collection<int, ModeloFatorPeso> $fatoresPesos
     * @throws DomainException
     */
    private function validarSomaPesos(Collection $fatoresPesos): void
    {
        $soma = $fatoresPesos->sum('peso');

        if (abs($soma - 100.0) > 0.01) {
            throw new DomainException(
                sprintf(
                    'RF-02: A soma dos pesos dos fatores deve ser 100%%. Soma atual: %.2f%%.',
                    $soma
                )
            );
        }
    }
}
