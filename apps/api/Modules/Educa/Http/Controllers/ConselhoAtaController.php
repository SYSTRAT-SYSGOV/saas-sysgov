<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\ConselhoAtaRequest;
use Modules\Educa\Http\Requests\ConselhoDeliberacaoAlunoRequest;
use Modules\Educa\Models\EducaConselhoAta;
use Modules\Educa\Services\ConselhoAtaService;

final class ConselhoAtaController extends Controller
{
    public function __construct(
        private readonly ConselhoAtaService $ataService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', EducaConselhoAta::class);

        $atas = $this->ataService->listar([
            'school_id' => $request->input('school_id'),
            'school_class_id' => $request->input('school_class_id'),
            'status' => $request->input('status'),
        ]);

        return response()->json([
            'data' => $atas,
        ]);
    }

    public function show(string $ataId): JsonResponse
    {
        $this->authorize('view', EducaConselhoAta::class);

        $ata = $this->ataService->obter($ataId);

        return response()->json([
            'data' => $ata,
        ]);
    }

    public function store(ConselhoAtaRequest $request): JsonResponse
    {
        $this->authorize('manageAta', EducaConselhoAta::class);

        $userId = (int) ($request->user()?->id ?? 1);
        $ata = $this->ataService->criarAta($request->validated(), $userId);

        return response()->json([
            'data' => $ata,
        ], 201);
    }

    public function update(ConselhoAtaRequest $request, string $ataId): JsonResponse
    {
        $this->authorize('manageAta', EducaConselhoAta::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $ata = $this->ataService->atualizarAta($ataId, $request->validated(), $userId);

            return response()->json([
                'data' => $ata,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'ata_bloqueada_para_edicao',
            ], 422);
        }
    }

    public function registrarDeliberacaoAluno(ConselhoDeliberacaoAlunoRequest $request, string $ataId): JsonResponse
    {
        $this->authorize('manageAta', EducaConselhoAta::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $deliberacao = $this->ataService->registrarDeliberacaoAluno(
                $ataId,
                $request->validated(),
                $userId
            );

            return response()->json([
                'data' => $deliberacao,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'ata_bloqueada_para_edicao',
            ], 422);
        }
    }

    public function registrarMembros(Request $request, string $ataId): JsonResponse
    {
        $this->authorize('manageAta', EducaConselhoAta::class);

        $request->validate([
            'membros' => ['required', 'array', 'min:1'],
            'membros.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'membros.*.cargo_funcao' => ['required', 'string', 'max:100'],
            'membros.*.presente' => ['boolean'],
        ]);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $this->ataService->registrarMembros($ataId, (array) $request->input('membros'), $userId);

            return response()->json([
                'message' => 'Membros registrados com sucesso.',
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'ata_bloqueada_para_edicao',
            ], 422);
        }
    }

    public function finalizar(Request $request, string $ataId): JsonResponse
    {
        $this->authorize('manageAta', EducaConselhoAta::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $ata = $this->ataService->finalizarAta($ataId, $userId);

            return response()->json([
                'data' => $ata,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'alunos_sem_deliberacao',
            ], 422);
        }
    }

    public function homologar(Request $request, string $ataId): JsonResponse
    {
        $this->authorize('homologarAta', EducaConselhoAta::class);

        try {
            $userId = (int) ($request->user()?->id ?? 1);
            $ata = $this->ataService->homologarAta($ataId, $userId);

            return response()->json([
                'data' => $ata,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
                'error_code' => 'ata_nao_finalizada',
            ], 422);
        }
    }
}
