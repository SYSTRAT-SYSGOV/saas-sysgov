<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaMealLog;
use Modules\Educa\Models\EducaSchool;

/**
 * Consolidação diária de refeições servidas, adesão da comunidade escolar e controle de desperdício.
 */
final class MealLogService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     tipo_refeicao?: string|null,
     *     data_inicio?: string|null,
     *     data_fim?: string|null
     * } $filtros
     * @return Collection<int, EducaMealLog>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaMealLog::query()
            ->with(['school', 'menu', 'responsavelRegistro'])
            ->orderByDesc('data_consumo');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['tipo_refeicao'])) {
            $query->where('tipo_refeicao', $filtros['tipo_refeicao']);
        }

        if (! empty($filtros['data_inicio'])) {
            $query->where('data_consumo', '>=', $filtros['data_inicio']);
        }

        if (! empty($filtros['data_fim'])) {
            $query->where('data_consumo', '<=', $filtros['data_fim']);
        }

        return $query->get();
    }

    public function obter(string $mealLogId): EducaMealLog
    {
        return EducaMealLog::query()
            ->with(['school', 'menu', 'responsavelRegistro'])
            ->findOrFail($mealLogId);
    }

    /**
     * Registra o consumo diário de uma refeição escolar.
     *
     * @param array{
     *     school_id: string,
     *     data_consumo: string,
     *     tipo_refeicao: string,
     *     total_previsto: int,
     *     total_servido: int,
     *     sobra_limpa_kg?: float|int|null,
     *     resto_ingesta_kg?: float|int|null,
     *     menu_id?: string|null,
     *     temperatura_servico_celsius?: float|int|null,
     *     observacoes?: string|null
     * } $dados
     */
    public function registrar(array $dados, int $tenantId, int $userId): EducaMealLog
    {
        $school = EducaSchool::findOrFail($dados['school_id']);

        $totalPrevisto = (int) $dados['total_previsto'];
        $totalServido = (int) $dados['total_servido'];

        if ($totalPrevisto < 0 || $totalServido < 0) {
            throw new InvalidArgumentException('As quantidades previstas e servidas não podem ser negativas.');
        }

        // Calcula taxa de adesão automaticamente
        $taxaAdesao = $totalPrevisto > 0
            ? round(($totalServido / $totalPrevisto) * 100, 2)
            : 0.0;

        $log = EducaMealLog::create([
            'tenant_id' => $tenantId,
            'school_id' => $school->id,
            'data_consumo' => $dados['data_consumo'],
            'tipo_refeicao' => $dados['tipo_refeicao'],
            'total_previsto' => $totalPrevisto,
            'total_servido' => $totalServido,
            'taxa_adesao_percentual' => $taxaAdesao,
            'sobra_limpa_kg' => $dados['sobra_limpa_kg'] ?? 0.0,
            'resto_ingesta_kg' => $dados['resto_ingesta_kg'] ?? 0.0,
            'menu_id' => $dados['menu_id'] ?? null,
            'temperatura_servico_celsius' => $dados['temperatura_servico_celsius'] ?? null,
            'observacoes' => $dados['observacoes'] ?? null,
            'responsavel_registro_id' => $userId,
        ]);

        $this->audit->record(
            'educa',
            'create',
            "educa_meal_log:{$log->id}",
            null,
            $log->toArray()
        );

        return $log->load(['school', 'menu']);
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $mealLogId, array $dados): EducaMealLog
    {
        $log = $this->obter($mealLogId);
        $anterior = $log->toArray();

        $previsto = isset($dados['total_previsto']) ? (int) $dados['total_previsto'] : $log->total_previsto;
        $servido = isset($dados['total_servido']) ? (int) $dados['total_servido'] : $log->total_servido;

        if ($previsto > 0) {
            $dados['taxa_adesao_percentual'] = round(($servido / $previsto) * 100, 2);
        }

        $log->update($dados);

        $this->audit->record(
            'educa',
            'update',
            "educa_meal_log:{$log->id}",
            $anterior,
            $log->toArray()
        );

        return $log->fresh(['school', 'menu']);
    }

    /**
     * Exclui um registro diário.
     */
    public function excluir(string $mealLogId): void
    {
        $log = $this->obter($mealLogId);
        $dados = $log->toArray();

        $log->delete();

        $this->audit->record(
            'educa',
            'delete',
            "educa_meal_log:{$mealLogId}",
            $dados,
            null
        );
    }

    /**
     * Gera relatório consolidado de desperdício e adesão por escola e período para o CAE/FNDE.
     *
     * @return array{
     *     total_registros: int,
     *     total_previsto: int,
     *     total_servido: int,
     *     media_adesao_percentual: float,
     *     sobra_limpa_kg_total: float,
     *     resto_ingesta_kg_total: float,
     *     desperdicio_total_kg: float,
     *     desperdicio_por_refeicao_gramas: float
     * }
     */
    public function relatorioDesperdicio(?string $schoolId = null, ?string $dataInicio = null, ?string $dataFim = null): array
    {
        $query = EducaMealLog::query();

        if ($schoolId !== null && $schoolId !== '') {
            $query->where('school_id', $schoolId);
        }

        if ($dataInicio !== null && $dataInicio !== '') {
            $query->where('data_consumo', '>=', $dataInicio);
        }

        if ($dataFim !== null && $dataFim !== '') {
            $query->where('data_consumo', '<=', $dataFim);
        }

        $totais = $query->selectRaw('
            COUNT(*) as total_registros,
            COALESCE(SUM(total_previsto), 0) as total_previsto,
            COALESCE(SUM(total_servido), 0) as total_servido,
            COALESCE(AVG(taxa_adesao_percentual), 0) as media_adesao,
            COALESCE(SUM(sobra_limpa_kg), 0) as total_sobra_limpa,
            COALESCE(SUM(resto_ingesta_kg), 0) as total_resto_ingesta
        ')->first();

        $previsto = (int) ($totais->total_previsto ?? 0);
        $servido = (int) ($totais->total_servido ?? 0);
        $sobraLimpa = (float) ($totais->total_sobra_limpa ?? 0.0);
        $restoIngesta = (float) ($totais->total_resto_ingesta ?? 0.0);
        $desperdicioTotal = $sobraLimpa + $restoIngesta;

        $desperdicioPorRefeicaoGramas = $servido > 0
            ? round(($desperdicioTotal * 1000) / $servido, 2)
            : 0.0;

        return [
            'total_registros' => (int) ($totais->total_registros ?? 0),
            'total_previsto' => $previsto,
            'total_servido' => $servido,
            'media_adesao_percentual' => round((float) ($totais->media_adesao ?? 0.0), 2),
            'sobra_limpa_kg_total' => round($sobraLimpa, 2),
            'resto_ingesta_kg_total' => round($restoIngesta, 2),
            'desperdicio_total_kg' => round($desperdicioTotal, 2),
            'desperdicio_por_refeicao_gramas' => $desperdicioPorRefeicaoGramas,
        ];
    }
}
