<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\Educa\Models\EducaAcademicYear;
use Modules\Educa\Models\EducaSchool;
use Modules\Educa\Models\EducaSchoolCapacity;

/**
 * Gestão de Capacidade e Oferta de Vagas Escolares com Travas Pessimistas.
 */
final class SchoolCapacityService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @param array{
     *     school_id?: string|null,
     *     academic_year_id?: string|null,
     *     etapa_ensino?: string|null,
     *     turno?: string|null
     * } $filtros
     * @return Collection<int, EducaSchoolCapacity>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaSchoolCapacity::query()
            ->with(['school', 'academicYear'])
            ->orderBy('etapa_ensino')
            ->orderBy('turno');

        if (! empty($filtros['school_id'])) {
            $query->where('school_id', $filtros['school_id']);
        }

        if (! empty($filtros['academic_year_id'])) {
            $query->where('academic_year_id', $filtros['academic_year_id']);
        }

        if (! empty($filtros['etapa_ensino'])) {
            $query->where('etapa_ensino', $filtros['etapa_ensino']);
        }

        if (! empty($filtros['turno'])) {
            $query->where('turno', $filtros['turno']);
        }

        return $query->get();
    }

    public function obter(string $capacityId): EducaSchoolCapacity
    {
        return EducaSchoolCapacity::query()
            ->with(['school', 'academicYear'])
            ->findOrFail($capacityId);
    }

    /**
     * Calcula o total de vagas livres remanescentes subtraindo ocupadas e reservadas.
     */
    public function calcularVagasRemanescentes(EducaSchoolCapacity $capacidade): int
    {
        $capacidadeMaxima = $capacidade->capacidade_maxima_alunos ?: $capacidade->vagas_totais;
        $ocupadas = (int) $capacidade->vagas_ocupadas;
        $reservadas = (int) $capacidade->vagas_reservadas;

        return max(0, $capacidadeMaxima - ($ocupadas + $reservadas));
    }

    /**
     * Cadastra nova capacidade e oferta de vagas para a escola.

     *
     * @param array{
     *     school_id: string,
     *     academic_year_id: string,
     *     etapa_ensino: string,
     *     turno: string,
     *     quantidade_salas?: int|null,
     *     capacidade_maxima_alunos: int
     * } $dados
     */
    public function criar(array $dados, int $tenantId): EducaSchoolCapacity
    {
        $school = EducaSchool::findOrFail($dados['school_id']);
        $ano = EducaAcademicYear::findOrFail($dados['academic_year_id']);

        $capacidadeMaxima = (int) $dados['capacidade_maxima_alunos'];
        if ($capacidadeMaxima <= 0) {
            throw new InvalidArgumentException('A capacidade máxima de alunos deve ser maior que zero.');
        }

        // Verifica duplicidade para a mesma escola, ano, etapa e turno
        $existente = EducaSchoolCapacity::query()
            ->where('school_id', $school->id)
            ->where('academic_year_id', $ano->id)
            ->where('etapa_ensino', $dados['etapa_ensino'])
            ->where('turno', $dados['turno'])
            ->first();

        if ($existente !== null) {
            throw new LogicException('Já existe capacidade cadastrada para esta escola, ano letivo, etapa e turno.');
        }

        $capacity = EducaSchoolCapacity::create([
            'tenant_id' => $tenantId,
            'school_id' => $school->id,
            'academic_year_id' => $ano->id,
            'etapa_ensino' => $dados['etapa_ensino'],
            'turno' => $dados['turno'],
            'quantidade_salas' => $dados['quantidade_salas'] ?? 1,
            'capacidade_maxima_alunos' => $capacidadeMaxima,
            'vagas_ocupadas' => 0,
            'vagas_reservadas' => 0,
        ]);

        $this->audit->record(
            'educa',
            'create',
            "educa_school_capacity:{$capacity->id}",
            null,
            $capacity->toArray()
        );

        return $capacity->load(['school', 'academicYear']);
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function atualizar(string $capacityId, array $dados): EducaSchoolCapacity
    {
        $capacity = $this->obter($capacityId);
        $anterior = $capacity->toArray();

        if (isset($dados['capacidade_maxima_alunos'])) {
            $novaCapacidade = (int) $dados['capacidade_maxima_alunos'];
            $totalAlocado = $capacity->vagas_ocupadas + $capacity->vagas_reservadas;

            if ($novaCapacidade < $totalAlocado) {
                throw new LogicException("A nova capacidade ({$novaCapacidade}) não pode ser inferior às vagas já ocupadas/reservadas ({$totalAlocado}).");
            }
        }

        $capacity->update($dados);

        $this->audit->record(
            'educa',
            'update',
            "educa_school_capacity:{$capacity->id}",
            $anterior,
            $capacity->toArray()
        );

        return $capacity->fresh(['school', 'academicYear']);
    }

    /**
     * Reserva vaga de forma atômica para candidato convocado usando lockForUpdate.
     */
    public function reservarVaga(string $schoolId, string $academicYearId, string $etapa, string $turno): EducaSchoolCapacity
    {
        return DB::transaction(function () use ($schoolId, $academicYearId, $etapa, $turno): EducaSchoolCapacity {
            $capacity = EducaSchoolCapacity::query()
                ->where('school_id', $schoolId)
                ->where('academic_year_id', $academicYearId)
                ->where('etapa_ensino', $etapa)
                ->where('turno', $turno)
                ->lockForUpdate()
                ->firstOrFail();

            $remanescentes = $capacity->capacidade_maxima_alunos - ($capacity->vagas_ocupadas + $capacity->vagas_reservadas);

            if ($remanescentes <= 0) {
                throw new LogicException('Não há vagas remanescentes disponíveis para reserva nesta unidade escolar.');
            }

            $anterior = $capacity->toArray();
            $capacity->increment('vagas_reservadas');

            $this->audit->record(
                'educa',
                'reservar_vaga',
                "educa_school_capacity:{$capacity->id}",
                $anterior,
                $capacity->fresh()->toArray()
            );

            return $capacity->fresh();
        });
    }

    /**
     * Libera vaga reservada em caso de desistência ou decurso de prazo (SLA).
     */
    public function liberarReservaVaga(string $schoolId, string $academicYearId, string $etapa, string $turno): EducaSchoolCapacity
    {
        return DB::transaction(function () use ($schoolId, $academicYearId, $etapa, $turno): EducaSchoolCapacity {
            $capacity = EducaSchoolCapacity::query()
                ->where('school_id', $schoolId)
                ->where('academic_year_id', $academicYearId)
                ->where('etapa_ensino', $etapa)
                ->where('turno', $turno)
                ->lockForUpdate()
                ->firstOrFail();

            if ($capacity->vagas_reservadas > 0) {
                $anterior = $capacity->toArray();
                $capacity->decrement('vagas_reservadas');

                $this->audit->record(
                    'educa',
                    'liberar_reserva',
                    "educa_school_capacity:{$capacity->id}",
                    $anterior,
                    $capacity->fresh()->toArray()
                );
            }

            return $capacity->fresh();
        });
    }

    /**
     * Converte vaga reservada em vaga definitivamente ocupada na efetivação da matrícula.
     */
    public function efetivarOcupacaoVaga(string $schoolId, string $academicYearId, string $etapa, string $turno): EducaSchoolCapacity
    {
        return DB::transaction(function () use ($schoolId, $academicYearId, $etapa, $turno): EducaSchoolCapacity {
            $capacity = EducaSchoolCapacity::query()
                ->where('school_id', $schoolId)
                ->where('academic_year_id', $academicYearId)
                ->where('etapa_ensino', $etapa)
                ->where('turno', $turno)
                ->lockForUpdate()
                ->firstOrFail();

            $anterior = $capacity->toArray();

            if ($capacity->vagas_reservadas > 0) {
                $capacity->decrement('vagas_reservadas');
            }
            $capacity->increment('vagas_ocupadas');

            $this->audit->record(
                'educa',
                'ocupar_vaga',
                "educa_school_capacity:{$capacity->id}",
                $anterior,
                $capacity->fresh()->toArray()
            );

            return $capacity->fresh();
        });
    }
}
