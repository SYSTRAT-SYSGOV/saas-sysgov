<?php

namespace Modules\Capd\Services;

use Modules\Capd\Exceptions\TravaIncidenteCriticoException;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\FatorAvaliacao;

/**
 * Motor de cálculo da Nota Final de Desempenho (NFD).
 *
 * FÓRMULA (spec §3.4):
 *   Nf  = (grau - 1) × 2,5
 *   NFD = Σ(Nf × peso) / Σ(pesos)
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
     * @param  array<string, array{grau: int, automatizado: bool}>  $respostas  Keyed by fator_codigo
     * @param  array<string, array{peso_geral: float, peso_magisterio: float, automatizado: bool}>  $fatores
     * @param  string  $plano   'GERAL' | 'MAGISTERIO'
     * @param  int     $cicloId
     * @param  int     $servidorId
     * @return array{nota_final: string, elegivel_progressao: bool, detalhamento: array}
     *
     * @throws TravaIncidenteCriticoException
     */
    public function calcular(
        array $respostas,
        array $fatores,
        string $plano,
        int $cicloId,
        int $servidorId,
    ): array {
        $camposPeso = $plano === 'MAGISTERIO' ? 'peso_magisterio' : 'peso_geral';

        // bcmath: precisão decimal exata — sem erros de ponto flutuante.
        // Notas de desempenho NÃO são monetárias, mas usamos bcmath
        // para garantir que Soma Ponderada / Soma Pesos seja idêntica
        // entre servidores, ciclos e planos (auditabilidade plena).
        $somaPonderada = '0';
        $somaPesos     = '0';
        $detalhamento  = [];

        foreach ($fatores as $codigo => $fator) {
            if (! isset($respostas[$codigo])) {
                continue;
            }

            $grau         = (int) $respostas[$codigo]['grau'];
            $automatizado = (bool) ($fator['automatizado'] ?? false);

            // ── Trava antileniência/antiprecipitação (spec §3.7) ─────
            if (in_array($grau, [1, 2, 5], true) && ! $automatizado) {
                $this->trava->validar($codigo, $cicloId, $servidorId, $fator['id']);
            }

            // ── Conversão grau → nota (0–10): Nf = (grau - 1) × 2,5 ─
            $notaFator = bcmul(
                bcsub((string) $grau, '1', self::PRECISAO),
                self::FATOR_CONVERSAO,
                self::PRECISAO,
            );

            $peso = number_format((float) $fator[$camposPeso], self::PRECISAO, '.', '');

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
     * Recalcula e persiste a nota na avaliação existente.
     * Usado internamente após ajuste pós-recurso.
     */
    public function recalcularEPersistir(Avaliacao $avaliacao, string $plano): void
    {
        $fatores = FatorAvaliacao::forTenant($avaliacao->tenant_id)
            ->get()
            ->keyBy('codigo')
            ->map(fn ($f) => $f->toArray())
            ->toArray();

        $resultado = $this->calcular(
            $avaliacao->respostas_fatores,
            $fatores,
            $plano,
            $avaliacao->ciclo_id,
            $avaliacao->servidor_id,
        );

        $avaliacao->update([
            'nota_final'          => $resultado['nota_final'],
            'elegivel_progressao' => $resultado['elegivel_progressao'],
        ]);
    }
}
