<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use LogicException;
use Modules\Educa\Models\EducaConselhoCronograma;
use Modules\Educa\Models\EducaConselhoPreConselho;
use Modules\Educa\Models\EducaConselhoPreConselhoAluno;
use Modules\Educa\Models\EducaEnrollment;

final class PreConselhoService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ConselhoCronogramaService $cronogramaService,
    ) {}

    /**
     * @param array{
     *     school_class_id?: string|null,
     *     cronograma_id?: string|null,
     *     periodo?: string|null,
     *     curriculum_component_id?: string|null
     * } $filtros
     * @return Collection<int, EducaConselhoPreConselho>
     */
    public function listar(array $filtros = []): Collection
    {
        $query = EducaConselhoPreConselho::query()
            ->with(['schoolClass', 'curriculumComponent', 'professor', 'alunosSinalizados.enrollment.aluno'])
            ->orderBy('created_at', 'desc');

        if (! empty($filtros['school_class_id'])) {
            $query->where('school_class_id', $filtros['school_class_id']);
        }

        if (! empty($filtros['cronograma_id'])) {
            $query->where('cronograma_id', $filtros['cronograma_id']);
        }

        if (! empty($filtros['periodo'])) {
            $query->where('periodo', $filtros['periodo']);
        }

        if (! empty($filtros['curriculum_component_id'])) {
            $query->where('curriculum_component_id', $filtros['curriculum_component_id']);
        }

        return $query->get();
    }

    public function obter(string $preConselhoId): EducaConselhoPreConselho
    {
        return EducaConselhoPreConselho::with([
            'schoolClass',
            'curriculumComponent',
            'professor',
            'cronograma',
            'alunosSinalizados.enrollment.aluno',
        ])->findOrFail($preConselhoId);
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function salvarFicha(array $dados, int $userId, bool $bypassPrazo = false, ?string $dataReferencia = null): EducaConselhoPreConselho
    {
        $cronograma = EducaConselhoCronograma::findOrFail($dados['cronograma_id']);

        if (! $bypassPrazo && ! $this->cronogramaService->isPrazoPreConselhoAberto($cronograma, $dataReferencia)) {
            throw new LogicException('O prazo de submissão do pré-conselho para este período está encerrado.');
        }

        $preConselho = EducaConselhoPreConselho::updateOrCreate(
            [
                'tenant_id' => $cronograma->tenant_id,
                'cronograma_id' => $cronograma->id,
                'school_class_id' => $dados['school_class_id'],
                'curriculum_component_id' => $dados['curriculum_component_id'],
            ],
            [
                'professor_user_id' => $dados['professor_user_id'] ?? $userId,
                'periodo' => $dados['periodo'] ?? $cronograma->periodo,
                'desempenho_geral_turma' => $dados['desempenho_geral_turma'],
                'objetivos_atingidos_percentual' => (int) ($dados['objetivos_atingidos_percentual'] ?? 0),
                'metodologias_utilizadas' => $dados['metodologias_utilizadas'] ?? [],
                'dificuldades_detectadas' => $dados['dificuldades_detectadas'] ?? null,
                'acoes_intervencao_sugeridas' => $dados['acoes_intervencao_sugeridas'] ?? null,
                'status' => 'ativo',
            ]
        );

        $this->audit->record(
            'educa',
            'educa.conselho.pre_conselho.saved',
            "educa_conselho_pre_conselho:{$preConselho->id}",
            null,
            $preConselho->toArray()
        );

        return $preConselho->fresh(['alunosSinalizados', 'curriculumComponent', 'schoolClass']);
    }

    /**
     * @param array<string, mixed> $dados
     */
    public function salvarAlunoSinalizado(string $preConselhoId, array $dados, int $userId): EducaConselhoPreConselhoAluno
    {
        $preConselho = $this->obter($preConselhoId);

        // Validação se a matrícula está ativa na turma
        $enrollment = EducaEnrollment::findOrFail($dados['enrollment_id']);
        $matriculadoNaTurma = $enrollment->enturmacoes()
            ->where('school_class_id', $preConselho->school_class_id)
            ->where('status', 'ativa')
            ->exists();

        if (! $matriculadoNaTurma) {
            throw new LogicException('O estudante selecionado não possui enturmação ativa nesta turma.');
        }

        $sinalizacao = EducaConselhoPreConselhoAluno::updateOrCreate(
            [
                'tenant_id' => $preConselho->tenant_id,
                'pre_conselho_id' => $preConselho->id,
                'enrollment_id' => $enrollment->id,
            ],
            [
                'nivel_atencao' => (string) $dados['nivel_atencao'],
                'motivo_atencao' => (string) $dados['motivo_atencao'],
                'detalhes' => $dados['detalhes'] ?? null,
                'encaminhamentos' => $dados['encaminhamentos'] ?? null,
            ]
        );

        $this->audit->record(
            'educa',
            'educa.conselho.pre_conselho.aluno_sinalizado',
            "educa_conselho_pre_conselho_aluno:{$sinalizacao->id}",
            null,
            $sinalizacao->toArray()
        );

        return $sinalizacao;
    }

    public function removerAlunoSinalizado(string $alunoId, int $userId): void
    {
        $sinalizacao = EducaConselhoPreConselhoAluno::findOrFail($alunoId);
        $before = $sinalizacao->toArray();
        $sinalizacao->delete();

        $this->audit->record(
            'educa',
            'educa.conselho.pre_conselho.aluno_removido',
            "educa_conselho_pre_conselho_aluno:{$sinalizacao->id}",
            $before,
            null
        );
    }
}
