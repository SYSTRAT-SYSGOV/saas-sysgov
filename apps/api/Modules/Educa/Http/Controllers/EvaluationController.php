<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Modules\Educa\Http\Requests\EvaluationRuleCreateRequest;
use Modules\Educa\Http\Requests\StudentGradeSaveRequest;
use Modules\Educa\Models\EducaEvaluationRule;
use Modules\Educa\Services\EvaluationService;

final class EvaluationController extends Controller
{
    public function __construct(
        private readonly EvaluationService $evaluationService,
    ) {}

    public function indexRegras(): JsonResponse
    {
        $this->authorize('viewAny', EducaEvaluationRule::class);

        $regras = $this->evaluationService->listarRegras();

        return response()->json([
            'data' => $regras,
        ]);
    }

    public function storeRegra(EvaluationRuleCreateRequest $request): JsonResponse
    {
        $this->authorize('manage', EducaEvaluationRule::class);

        $tenantId = app(TenantContext::class)->id();
        $dados = $request->validated();
        $dados['tenant_id'] = $tenantId;

        $regra = $this->evaluationService->criarRegra($dados);

        return response()->json([
            'data' => $regra,
        ], 201);
    }

    public function storeNotas(
        string $turmaId,
        string $componentId,
        StudentGradeSaveRequest $request
    ): JsonResponse {
        $this->authorize('manage', EducaEvaluationRule::class);

        $this->evaluationService->salvarNotas(
            $turmaId,
            $componentId,
            (int) $request->input('etapa_sequencial'),
            $request->input('notas'),
            $request->input('evaluation_rule_id')
        );

        return response()->json([
            'message' => 'Notas gravadas com sucesso.',
        ]);
    }

    public function mapaNotas(string $turmaId, string $componentId): JsonResponse
    {
        $this->authorize('view', EducaEvaluationRule::class);

        $mapa = $this->evaluationService->obterMapaNotasTurma($turmaId, $componentId);

        return response()->json([
            'data' => $mapa,
        ]);
    }
}
