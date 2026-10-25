<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\PreConselhoAlunoRequest;
use Modules\Educa\Http\Requests\PreConselhoRequest;
use Modules\Educa\Models\EducaConselhoPreConselho;
use Modules\Educa\Services\PreConselhoService;

final class PreConselhoController extends Controller
{
    public function __construct(
        private readonly PreConselhoService $preConselhoService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaConselhoPreConselho::class);

        $preConselhos = $this->preConselhoService->listar([
            'school_class_id' => $request->input('school_class_id'),
            'cronograma_id' => $request->input('cronograma_id'),
            'periodo' => $request->input('periodo'),
            'curriculum_component_id' => $request->input('curriculum_component_id'),
        ]);

        return response()->json([
            'data' => $preConselhos,
        ]);
    }

    public function show(string $preConselhoId): JsonResponse
    {
        $this->authorize('view', EducaConselhoPreConselho::class);

        $preConselho = $this->preConselhoService->obter($preConselhoId);

        return response()->json([
            'data' => $preConselho,
        ]);
    }

    public function store(PreConselhoRequest $request): JsonResponse
    {
        $this->authorize('managePreConselho', EducaConselhoPreConselho::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $canBypass = (bool) ($request->user()?->can('manageCronograma', EducaConselhoPreConselho::class) ?? false);
            $bypassPrazo = $canBypass && $request->boolean('bypass_prazo', false);
            $dataReferencia = $request->header('X-Data-Referencia');

            $preConselho = $this->preConselhoService->salvarFicha(
                $request->validated(),
                $userId,
                $bypassPrazo,
                $dataReferencia
            );

            return response()->json([
                'data' => $preConselho,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'prazo_pre_conselho_encerrado',
            ], 422);
        }
    }

    public function salvarAluno(PreConselhoAlunoRequest $request, string $preConselhoId): JsonResponse
    {
        $this->authorize('managePreConselho', EducaConselhoPreConselho::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $sinalizacao = $this->preConselhoService->salvarAlunoSinalizado(
                $preConselhoId,
                $request->validated(),
                $userId
            );

            return response()->json([
                'data' => $sinalizacao,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'aluno_nao_pertence_turma',
            ], 422);
        }
    }

    public function removerAluno(Request $request, string $alunoId): JsonResponse
    {
        $this->authorize('managePreConselho', EducaConselhoPreConselho::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $this->preConselhoService->removerAlunoSinalizado($alunoId, $userId);

        return response()->json(null, 204);
    }
}
