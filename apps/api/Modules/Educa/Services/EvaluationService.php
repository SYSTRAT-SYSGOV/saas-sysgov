<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Educa\Models\EducaClassEnrollment;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaEvaluationRule;
use Modules\Educa\Models\EducaGradeScale;
use Modules\Educa\Models\EducaSchoolClass;
use Modules\Educa\Models\EducaStudentGrade;

/**
 * Serviço de Avaliação Escolar, Lançamento de Notas e Consolidação de Médias.
 */
final class EvaluationService
{
    public function __construct(
        private readonly EvaluationFormulaEvaluator $formulaEvaluator,
        private readonly AttendanceService $attendanceService,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Cadastra uma nova regra de avaliação e valida sintaxe da fórmula sem eval.
     *
     * @param array<string, mixed> $dados
     */
    public function criarRegra(array $dados): EducaEvaluationRule
    {
        // 1. Validação de sintaxe matemática segura da fórmula (ADR 002)
        if (!empty($dados['formula_media_anual'])) {
            $valido = $this->formulaEvaluator->validateSyntax((string) $dados['formula_media_anual']);
            if (!$valido) {
                throw ValidationException::withMessages([
                    'formula_media_anual' => ['A sintaxe da fórmula de média anual é inválida ou possui caracteres não permitidos.'],
                ]);
            }
        }

        if (!empty($dados['formula_recuperacao'])) {
            $validoRec = $this->formulaEvaluator->validateSyntax((string) $dados['formula_recuperacao']);
            if (!$validoRec) {
                throw ValidationException::withMessages([
                    'formula_recuperacao' => ['A sintaxe da fórmula de recuperação é inválida.'],
                ]);
            }
        }

        /** @var EducaEvaluationRule $regra */
        $regra = EducaEvaluationRule::create($dados);

        $this->audit->record('educa', 'evaluation_rule.created', "EducaEvaluationRule #{$regra->id}", null, $regra->toArray());

        return $regra;
    }

    /**
     * Cadastra faixas de arredondamento para a regra de avaliação.
     *
     * @param array<int, array{limite_inferior: float, limite_superior: float, nota_arredondada: float, conceito_alfabetico?: string|null}> $escalas
     */
    public function salvarEscalasArredondamento(string $evaluationRuleId, array $escalas): void
    {
        $regra = EducaEvaluationRule::query()->where('id', $evaluationRuleId)->firstOrFail();

        DB::transaction(function () use ($regra, $escalas): void {
            EducaGradeScale::query()->where('evaluation_rule_id', $regra->id)->delete();

            foreach ($escalas as $escala) {
                EducaGradeScale::create([
                    'tenant_id' => $regra->tenant_id,
                    'evaluation_rule_id' => $regra->id,
                    'limite_inferior' => $escala['limite_inferior'],
                    'limite_superior' => $escala['limite_superior'],
                    'nota_arredondada' => $escala['nota_arredondada'],
                    'conceito_alfabetico' => $escala['conceito_alfabetico'] ?? null,
                ]);
            }
        });
    }

    /**
     * Salva ou atualiza notas de uma turma em um componente para determinada etapa sequencial.
     *
     * @param array<int, array{enrollment_id: string, nota: float, nota_recuperacao?: float|null, parecer?: string|null}> $notas
     */
    public function salvarNotas(
        string $schoolClassId,
        string $curriculumComponentId,
        int $etapaSequencial,
        array $notas,
        ?string $evaluationRuleId = null
    ): void {
        $turma = EducaSchoolClass::query()->where('id', $schoolClassId)->firstOrFail();

        // Se a regra não for fornecida, busca regra padrão ativa
        if ($evaluationRuleId === null) {
            $regra = EducaEvaluationRule::query()
                ->where('tenant_id', $turma->tenant_id)
                ->where('ativo', true)
                ->first();
            $evaluationRuleId = $regra?->id;
        }

        DB::transaction(function () use ($turma, $curriculumComponentId, $etapaSequencial, $notas, $evaluationRuleId): void {
            foreach ($notas as $item) {
                $matriculaId = $item['enrollment_id'];
                $notaBruta = (float) $item['nota'];
                $notaRecuperacao = isset($item['nota_recuperacao']) ? (float) $item['nota_recuperacao'] : null;
                $parecer = $item['parecer'] ?? null;

                EducaStudentGrade::updateOrCreate(
                    [
                        'tenant_id' => $turma->tenant_id,
                        'enrollment_id' => $matriculaId,
                        'curriculum_component_id' => $curriculumComponentId,
                        'etapa_sequencial' => $etapaSequencial,
                    ],
                    [
                        'evaluation_rule_id' => $evaluationRuleId,
                        'nota_bruta' => $notaBruta,
                        'nota_recuperacao' => $notaRecuperacao,
                        'nota_arredondada' => $notaBruta,
                        'parecer_descritivo' => $parecer,
                    ]
                );
            }

            $this->audit->record(
                'educa',
                'grades.saved',
                "Turma #{$turma->id} - Componente #{$curriculumComponentId}",
                null,
                ['etapa' => $etapaSequencial, 'total_alunos' => count($notas)]
            );
        });
    }

    /**
     * Aplica a tabela municipal de arredondamento sobre um valor de nota.
     */
    public function arredondarNota(float $nota, EducaEvaluationRule $regra): float
    {
        $escalas = EducaGradeScale::query()
            ->where('evaluation_rule_id', $regra->id)
            ->orderBy('limite_inferior')
            ->get();

        foreach ($escalas as $escala) {
            if ($nota >= (float) $escala->limite_inferior && $nota <= (float) $escala->limite_superior) {
                return (float) $escala->nota_arredondada;
            }
        }

        return round($nota, 2);
    }

    /**
     * Calcula a média anual e a situação do aluno usando o motor de avaliação declarativo sem eval.
     *
     * @return array{media_bruta: float, media_anual: float, situacao: string}
     */
    public function calcularMediaAnual(string $enrollmentId, string $curriculumComponentId): array
    {
        $matricula = EducaEnrollment::query()->where('id', $enrollmentId)->firstOrFail();

        $notas = EducaStudentGrade::query()
            ->where('enrollment_id', $enrollmentId)
            ->where('curriculum_component_id', $curriculumComponentId)
            ->orderBy('etapa_sequencial')
            ->get();

        if ($notas->isEmpty()) {
            return [
                'media_bruta' => 0.0,
                'media_anual' => 0.0,
                'situacao' => 'em_andamento',
            ];
        }

        /** @var EducaEvaluationRule|null $regra */
        $regra = EducaEvaluationRule::query()
            ->where('id', $notas->first()->evaluation_rule_id)
            ->first() ?? EducaEvaluationRule::query()->where('tenant_id', $matricula->tenant_id)->first();

        if ($regra === null || empty($regra->formula_media_anual)) {
            // Média simples fallback se não houver regra configurada
            $mediaSimples = (float) $notas->avg('nota_bruta');
            return [
                'media_bruta' => round($mediaSimples, 2),
                'media_anual' => round($mediaSimples, 2),
                'situacao' => $mediaSimples >= 6.0 ? 'aprovado' : 'retido_nota',
            ];
        }

        // Monta o mapa de variáveis para a fórmula (E1, E2, E3, E4, etc.)
        $variaveis = [];
        foreach ($notas as $notaRegistro) {
            $chave = "E{$notaRegistro->etapa_sequencial}";
            $valorEfetivo = (float) $notaRegistro->nota_bruta;

            // Se houver recuperação para a etapa e fórmula de recuperação
            if ($notaRegistro->nota_recuperacao !== null && !empty($regra->formula_recuperacao)) {
                $valorEfetivo = $this->formulaEvaluator->evaluate($regra->formula_recuperacao, [
                    'E' => (float) $notaRegistro->nota_bruta,
                    'REC' => (float) $notaRegistro->nota_recuperacao,
                ]);
            }

            $variaveis[$chave] = $valorEfetivo;
        }

        // Executa a fórmula declarativa de média anual com o parser seguro sem eval
        $mediaBruta = $this->formulaEvaluator->evaluate($regra->formula_media_anual, $variaveis);

        // Aplica tabela de arredondamento oficial
        $mediaArredondada = $this->arredondarNota($mediaBruta, $regra);

        // Define a situação
        $situacao = 'em_andamento';
        if ($notas->count() >= 4) { // Assumindo 4 etapas para conclusão
            $situacao = $mediaArredondada >= (float) $regra->nota_minima_aprovacao ? 'aprovado' : 'retido_nota';
        }

        return [
            'media_bruta' => round($mediaBruta, 2),
            'media_anual' => $mediaArredondada,
            'situacao' => $situacao,
        ];
    }

    /**
     * Obtém o mapa de notas e médias consolidado de uma turma em um componente curricular.
     *
     * @return array<int, array<string, mixed>>
     */
    public function obterMapaNotasTurma(string $schoolClassId, string $curriculumComponentId): array
    {
        $enturmacoes = EducaClassEnrollment::query()
            ->with(['matricula.aluno'])
            ->where('school_class_id', $schoolClassId)
            ->where('status', EducaClassEnrollment::STATUS_ATIVA)
            ->orderBy('numero_ordem')
            ->get();

        $mapa = [];

        foreach ($enturmacoes as $enturmacao) {
            $matricula = $enturmacao->matricula;
            if ($matricula === null) {
                continue;
            }

            $notas = EducaStudentGrade::query()
                ->where('enrollment_id', $matricula->id)
                ->where('curriculum_component_id', $curriculumComponentId)
                ->get();

            $notasEtapas = [];
            foreach ($notas as $n) {
                $notasEtapas["etapa_{$n->etapa_sequencial}"] = (float) $n->nota_bruta;
            }

            $resultado = $this->calcularMediaAnual($matricula->id, $curriculumComponentId);
            $freq = $this->attendanceService->calcularPercentualFrequencia($enturmacao->id);

            $situacao = $resultado['situacao'];
            if ($freq < 75.0 && $situacao !== 'em_andamento') {
                $situacao = 'retido_frequencia';
            }

            $mapa[] = [
                'enrollment_id' => $matricula->id,
                'aluno_nome' => $matricula->aluno?->nome ?? 'Estudante',
                'numero_ordem' => $enturmacao->numero_ordem ?? 1,
                'notas_etapas' => $notasEtapas,
                'media_anual' => $resultado['media_anual'],
                'percentual_frequencia' => $freq,
                'situacao' => $situacao,
            ];
        }

        return $mapa;
    }

    /**
     * Lista todas as regras de avaliação ativas.
     *
     * @return Collection<int, EducaEvaluationRule>
     */
    public function listarRegras(): Collection
    {
        return EducaEvaluationRule::query()->with('escalas')->get();
    }
}
