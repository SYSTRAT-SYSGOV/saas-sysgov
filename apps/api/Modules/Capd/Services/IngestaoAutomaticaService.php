<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use Illuminate\Support\Facades\DB;
use Modules\Capd\Contracts\AssiduacaoDados;
use Modules\Capd\Contracts\DisciplinaDados;
use Modules\Capd\Contracts\HrAdapterInterface;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\FatorAvaliacao;

/**
 * Ingestão Automática de F1 (Assiduidade) e F2 (Disciplina).
 *
 * Resolve o adapter correto (manual ou API) de acordo com a
 * configuração do ciclo (modo_f1 / modo_f2) e calcula o grau
 * determinístico conforme a tabela da spec §3.8:
 *
 *  F1 – Assiduidade e Pontualidade:
 *   0 faltas + 0–2 atrasos tolerados          → Grau 4 ou 5 (histórico pleno = 5)
 *   1 falta  + 3–5 atrasos injust.             → Grau 3 (Regular)
 *   2–4 faltas + 6–10 atrasos + Advertência   → Grau 2 (Insuficiente)
 *   ≥5 faltas + >10 atrasos + Suspensão       → Grau 1 (Crítico)
 *
 *  F2 – Disciplina e Respeito às Normas:
 *   Nenhuma penalidade                         → Grau 5
 *   Advertência formal                         → Grau 3
 *   Suspensão disciplinar                      → Grau 1
 */
final class IngestaoAutomaticaService
{
    /** @param array<string, HrAdapterInterface> $adapters Keyed by identificador() */
    public function __construct(
        private readonly array $adapters = [],
    ) {}

    /**
     * Calcula os graus de F1 e F2 para um servidor no ciclo.
     *
     * @return array{F1: array{grau: int, nota: string, fonte: string}, F2: array{grau: int, nota: string, fonte: string}}
     */
    public function calcularF1F2(
        CicloAvaliacao $ciclo,
        int $servidorId,
        string $cpf,
    ): array {
        $adapterF1 = $this->resolverAdapter($ciclo->modo_f1);
        $adapterF2 = $this->resolverAdapter($ciclo->modo_f2);

        $inicio = $ciclo->data_inicio_avaliacao->toDateString();
        $fim    = $ciclo->data_fim_avaliacao->toDateString();

        // ── F1: Assiduidade ───────────────────────────────────────────
        $assiduidade = $adapterF1->obterAssiduidade($servidorId, $ciclo->id, $cpf, $inicio, $fim);
        $grauF1      = $this->grauAssiduidade($assiduidade);
        $notaF1      = number_format(($grauF1 - 1) * 2.5, 2, '.', '');

        // ── F2: Disciplina ─────────────────────────────────────────────
        $disciplina = $adapterF2->obterDisciplina($servidorId, $ciclo->id, $cpf, $inicio, $fim);
        $grauF2     = $this->grauDisciplina($disciplina);
        $notaF2     = number_format(($grauF2 - 1) * 2.5, 2, '.', '');

        return [
            'F1' => [
                'grau'  => $grauF1,
                'nota'  => $notaF1,
                'fonte' => $adapterF1->identificador(),
                'dados' => [
                    'faltas_injustificadas'  => $assiduidade->faltasInjustificadas,
                    'atrasos_injustificados' => $assiduidade->atrasosInjustificados,
                ],
            ],
            'F2' => [
                'grau'  => $grauF2,
                'nota'  => $notaF2,
                'fonte' => $adapterF2->identificador(),
                'dados' => [
                    'penalidades'          => $disciplina->penalidades,
                    'tipo_penalidade_max'  => $disciplina->tipoPenalidadeMaxima,
                ],
            ],
        ];
    }

    // ── Regras determinísticas spec §3.8 ─────────────────────────────

    private function grauAssiduidade(AssiduacaoDados $dados): int
    {
        $faltas   = $dados->faltasInjustificadas;
        $atrasos  = $dados->atrasosInjustificados;

        return match (true) {
            $faltas >= 5 || $atrasos > 10   => 1, // Crítico
            $faltas >= 2 || $atrasos >= 6   => 2, // Insuficiente
            $faltas === 1 || $atrasos >= 3  => 3, // Regular
            $faltas === 0 && $atrasos <= 2  => $dados->grauCalculado === 5 ? 5 : 4, // Bom ou Excelente
            default                         => 3,
        };
    }

    private function grauDisciplina(DisciplinaDados $dados): int
    {
        return match ($dados->tipoPenalidadeMaxima) {
            2       => 1, // Suspensão → Crítico
            1       => 3, // Advertência → Regular
            default => 5, // Nenhuma penalidade → Excelente
        };
    }

    private function resolverAdapter(string $modo): HrAdapterInterface
    {
        $adapter = $this->adapters[$modo] ?? $this->adapters['manual'] ?? null;

        if ($adapter === null) {
            throw new \RuntimeException(
                "Nenhum adapter HR configurado para o modo '{$modo}'. " .
                "Registre ManualHrAdapter ou IpmApiAdapter no ServiceProvider.",
            );
        }

        return $adapter;
    }
}
