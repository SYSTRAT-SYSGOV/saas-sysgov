<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use LogicException;
use Modules\Educa\Models\EducaCourse;
use Modules\Educa\Models\EducaCurriculumComponent;
use Modules\Educa\Models\EducaCurriculumMatrix;
use Modules\Educa\Models\EducaGrade;
use Modules\Educa\Models\EducaKnowledgeArea;
use Modules\Educa\Models\EducaMatrixComponent;

/**
 * Serviço de Negócio para Cursos, Séries, Componentes BNCC e Matrizes Curriculares.
 */
final class CurriculumService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * @return Collection<int, EducaCourse>
     */
    public function listarCursos(): Collection
    {
        return EducaCourse::orderBy('nome')->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     codigo: string,
     *     nome: string,
     *     nivel: string,
     *     modalidade: string
     * } $dados
     */
    public function criarCurso(array $dados): EducaCourse
    {
        if (EducaCourse::where('codigo', $dados['codigo'])->exists()) {
            throw new LogicException("Já existe um curso cadastrado com o código {$dados['codigo']}.");
        }

        return DB::transaction(function () use ($dados): EducaCourse {
            $curso = EducaCourse::create($dados);
            $this->audit->record('educa', 'course.created', "EducaCourse #{$curso->id}", null, $curso->toArray());

            return $curso;
        });
    }

    /**
     * @return Collection<int, EducaGrade>
     */
    public function listarSeries(string $courseId): Collection
    {
        return EducaGrade::where('course_id', $courseId)
            ->orderBy('sequencial')
            ->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     sequencial: int,
     *     codigo: string,
     *     nome: string,
     *     carga_horaria_minima_anual: int,
     *     dias_letivos_minimos: int
     * } $dados
     */
    public function criarSerie(string $courseId, array $dados): EducaGrade
    {
        $dados['course_id'] = $courseId;

        $conflito = EducaGrade::where('course_id', $courseId)
            ->where('sequencial', $dados['sequencial'])
            ->exists();

        if ($conflito) {
            throw new LogicException("O curso já possui uma série com sequencial {$dados['sequencial']}.");
        }

        return DB::transaction(function () use ($dados): EducaGrade {
            $serie = EducaGrade::create($dados);
            $this->audit->record('educa', 'grade.created', "EducaGrade #{$serie->id}", null, $serie->toArray());

            return $serie;
        });
    }

    /**
     * @return Collection<int, EducaKnowledgeArea>
     */
    public function listarAreas(): Collection
    {
        return EducaKnowledgeArea::orderBy('ordem')->orderBy('nome')->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     codigo: string,
     *     nome: string,
     *     secao?: string|null,
     *     ordem?: int
     * } $dados
     */
    public function criarArea(array $dados): EducaKnowledgeArea
    {
        if (EducaKnowledgeArea::where('codigo', $dados['codigo'])->exists()) {
            throw new LogicException("Já existe uma área de conhecimento com o código {$dados['codigo']}.");
        }

        return DB::transaction(function () use ($dados): EducaKnowledgeArea {
            $area = EducaKnowledgeArea::create($dados);
            $this->audit->record('educa', 'knowledge_area.created', "EducaKnowledgeArea #{$area->id}", null, $area->toArray());

            return $area;
        });
    }

    /**
     * @return Collection<int, EducaCurriculumComponent>
     */
    public function listarComponentes(): Collection
    {
        return EducaCurriculumComponent::with('areaConhecimento')->orderBy('nome')->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     knowledge_area_id: string,
     *     codigo: string,
     *     codigo_educacenso_inep?: string|null,
     *     nome: string,
     *     sigla: string,
     *     base_curricular: string,
     *     desconsiderar_progressao?: bool,
     *     color_hex?: string
     * } $dados
     */
    public function criarComponente(array $dados): EducaCurriculumComponent
    {
        if (EducaCurriculumComponent::where('codigo', $dados['codigo'])->exists()) {
            throw new LogicException("Já existe um componente curricular com o código {$dados['codigo']}.");
        }

        return DB::transaction(function () use ($dados): EducaCurriculumComponent {
            $comp = EducaCurriculumComponent::create($dados);
            $this->audit->record('educa', 'curriculum_component.created', "EducaCurriculumComponent #{$comp->id}", null, $comp->toArray());

            return $comp;
        });
    }

    /**
     * @return Collection<int, EducaCurriculumMatrix>
     */
    public function listarMatrizes(?string $courseId = null, ?string $gradeId = null): Collection
    {
        $query = EducaCurriculumMatrix::query()->with(['curso', 'serie', 'componentes.componente']);

        if (!empty($courseId)) {
            $query->where('course_id', $courseId);
        }

        if (!empty($gradeId)) {
            $query->where('grade_id', $gradeId);
        }

        return $query->orderByDesc('ano_vigencia')->get();
    }

    /**
     * @param array{
     *     tenant_id: int,
     *     course_id: string,
     *     grade_id: string,
     *     nome: string,
     *     ano_vigencia: int
     * } $dados
     */
    public function criarMatriz(array $dados): EducaCurriculumMatrix
    {
        $conflito = EducaCurriculumMatrix::where('course_id', $dados['course_id'])
            ->where('grade_id', $dados['grade_id'])
            ->where('ano_vigencia', $dados['ano_vigencia'])
            ->exists();

        if ($conflito) {
            throw new LogicException("Já existe uma matriz cadastrada para esta série no exercício {$dados['ano_vigencia']}.");
        }

        return DB::transaction(function () use ($dados): EducaCurriculumMatrix {
            $matriz = EducaCurriculumMatrix::create($dados);
            $this->audit->record('educa', 'curriculum_matrix.created', "EducaCurriculumMatrix #{$matriz->id}", null, $matriz->toArray());

            return $matriz;
        });
    }

    /**
     * Configura os componentes da matriz curricular e recalcula a carga horária anual.
     *
     * @param list<array{
     *     component_id: string,
     *     horas_semanais: int,
     *     horas_anuais: int,
     *     tipo_nota: string
     * }> $componentes
     */
    public function configurarComponentes(EducaCurriculumMatrix $matriz, array $componentes): EducaCurriculumMatrix
    {
        return DB::transaction(function () use ($matriz, $componentes): EducaCurriculumMatrix {
            // Remove componentes anteriores
            EducaMatrixComponent::where('matrix_id', $matriz->id)->delete();

            foreach ($componentes as $item) {
                EducaMatrixComponent::create([
                    'tenant_id' => $matriz->tenant_id,
                    'matrix_id' => $matriz->id,
                    'component_id' => $item['component_id'],
                    'horas_semanais' => $item['horas_semanais'],
                    'horas_anuais' => $item['horas_anuais'],
                    'tipo_nota' => $item['tipo_nota'],
                ]);
            }

            $matriz->recalcularTotalHorasAnuais();

            $this->audit->record('educa', 'curriculum_matrix.components_configured', "EducaCurriculumMatrix #{$matriz->id}", null, [
                'total_horas_anuais' => $matriz->total_horas_anuais,
                'count' => count($componentes),
            ]);

            return $matriz->fresh(['componentes.componente']);
        });
    }
}
