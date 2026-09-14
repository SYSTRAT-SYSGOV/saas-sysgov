<?php

namespace Modules\Capd\Services;

use DomainException;
use Illuminate\Support\Collection;
use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\ModeloFatorPeso;

/**
 * Motor de cálculo da Nota Final de Desempenho (NFD).
 *
 * FÓRMULA (spec §3.4):
 *   Nf  = (grau - 1) × 2,5
 *   NFD = Σ(Nf × peso) / Σ(pesos)
 *
 * Os pesos vêm de ModeloFatorPeso (RF-02, configuráveis por modelo de formulário
 * pela Comissão) — a soma dos pesos não precisa ser 10 nem 100: a média ponderada
 * é invariante de escala, então qualquer proporção consistente produz o mesmo NFD.
 *
 * Usa bcmath para garantir precisão decimal exata.
 * NUNCA usa float para aritmética monetária ou de notas.
 *
 * Elegibilidade para progressão: NFD ≥ 7,00 (spec §11.1)
 */
final class CalculadoraNotaService
{
    /** Casas decimais internas para bcmath (excesso garante precisão). */
    private const PRECISAO = 10;

    /** Fator de conversão grau → nota: (grau - 1) × 2,5 */
    private const FATOR_CONVERSAO = '2.5';

    public function __construct(
        private readonly TravaElectronicaService $trava,
    ) {}

    /**
     * Calcula a NFD para uma avaliação ainda não submetida.
     *
     * @param  array<string, array{grau: int, automatizado?: bool}>  $respostas  Keyed by fator_codigo
     * @param  Collection<int, ModeloFatorPeso>  $fatoresPesos  Pesos do modelo de formulário vigente (com ->fator carregado)
     * @param  int  $cicloId
     * @param  int  $servidorId
     * @return array{nota_final: string, elegivel_progressao: bool, detalhamento: array}
     *
     * @throws TravaIncidenteCriticoException
     * @throws DomainException se o modelo não tem pesos configurados ou nenhum fator respondido casa com o modelo
     */
    public function calcular(
        array $respostas,
        Collection $fatoresPesos,
        int $cicloId,
        int $servidorId,
    ): array {
        if ($fatoresPesos->isEmpty()) {
            throw new DomainException('RF-02: o modelo de formulário não tem pesos de fatores configurados.');
        }

        // bcmath: precisão decimal exata — sem erros de ponto flutuante.
        // Notas de desempenho NÃO são monetárias, mas usamos bcmath para garantir
        // que Soma Ponderada / Soma Pesos seja idêntica entre servidores, ciclos e
        // planos (auditabilidade plena).
        $somaPonderada = '0';
        $somaPesos     = '0';
        $detalhamento  = [];

        foreach ($fatoresPesos as $mfp) {
            $codigo = $mfp->fator?->codigo;

            if ($codigo === null || ! isset($respostas[$codigo])) {
                continue;
            }

            $grau         = (int) $respostas[$codigo]['grau'];
            $automatizado = (bool) ($mfp->fator?->automatizado ?? false);

            // ── Trava antileniência/antiprecipitação (spec §3.7) ─────
            if (in_array($grau, [1, 2, 5], true) && ! $automatizado) {
                $this->trava->validar($codigo, $cicloId, $servidorId, $mfp->fator_id);
            }

            // ── Conversão grau → nota (0–10): Nf = (grau - 1) × 2,5 ─
            $notaFator = bcmul(
                bcsub((string) $grau, '1', self::PRECISAO),
                self::FATOR_CONVERSAO,
                self::PRECISAO,
            );

            $peso = number_format((float) $mfp->peso, self::PRECISAO, '.', '');

            $somaPonderada = bcadd(
                $somaPonderada,
                bcmul($notaFator, $peso, self::PRECISAO),
                self::PRECISAO,
            );
            $somaPesos = bcadd($somaPesos, $peso, self::PRECISAO);

            $detalhamento[$codigo] = [
                'grau'      => $grau,
                'nota'      => $notaFator,
                'peso'      => $peso,
                'ponderado' => bcmul($notaFator, $peso, self::PRECISAO),
            ];
        }

        if (bccomp($somaPesos, '0', self::PRECISAO) === 0) {
            throw new DomainException('RF-02: nenhuma resposta corresponde aos fatores configurados no modelo de formulário.');
        }

        // ── NFD arredondada para 2 casas (spec §11.1) ─────────────────
        $notaFinal         = bcdiv($somaPonderada, $somaPesos, self::PRECISAO);
        $notaFinalArred    = number_format((float) $notaFinal, 2, '.', '');

        return [
            'nota_final'          => $notaFinalArred,
            'elegivel_progressao' => bccomp($notaFinalArred, '7.00', 2) >= 0,
            'detalhamento'        => $detalhamento,
        ];
    }

    /**
     * Recalcula e persiste a nota na avaliação existente, usando o modelo de
     * formulário vinculado à avaliação (CA-03: mesmo modelo da submissão original).
     */
    public function recalcularEPersistir(Avaliacao $avaliacao): void
    {
        $modelo = $avaliacao->modeloFormulario;

        if ($modelo === null) {
            throw new DomainException("Avaliação #{$avaliacao->id} não tem modelo de formulário vinculado — não é possível recalcular.");
        }

        $resultado = $this->calcular(
            $avaliacao->respostas_fatores,
            $modelo->fatoresComPesosEfetivos(),
            $avaliacao->ciclo_id,
            $avaliacao->servidor_id,
        );

        $avaliacao->update([
            'nota_final'          => $resultado['nota_final'],
            'elegivel_progressao' => $resultado['elegivel_progressao'],
        ]);
    }
}
