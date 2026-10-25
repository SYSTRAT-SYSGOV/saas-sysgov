<?php

declare(strict_types=1);

namespace Modules\Educa\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use LogicException;
use Modules\Educa\Http\Requests\AnnouncementCreateRequest;
use Modules\Educa\Http\Requests\AnnouncementUpdateRequest;
use Modules\Educa\Models\EducaAnnouncement;
use Modules\Educa\Services\AnnouncementService;

final class AnnouncementController extends Controller
{
    public function __construct(
        private readonly AnnouncementService $announcementService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAvisos', EducaAnnouncement::class);

        $avisos = $this->announcementService->listar([
            'escola_id' => $request->query('escola_id'),
            'turma_id' => $request->query('turma_id'),
            'urgencia' => $request->query('urgencia'),
            'status' => $request->query('status'),
            'ativo' => $request->has('ativo') ? $request->boolean('ativo') : null,
            'busca' => $request->query('busca'),
        ]);

        return response()->json([
            'data' => $avisos,
        ]);
    }

    public function store(AnnouncementCreateRequest $request): JsonResponse
    {
        $this->authorize('manageAvisos', EducaAnnouncement::class);

        $dados = $request->validated();
        $dados['tenant_id'] = app(TenantContext::class)->id();
        $dados['autor_user_id'] = $request->user()?->id;

        try {
            $aviso = $this->announcementService->criar($dados);

            return response()->json([
                'data' => $aviso,
            ], 201);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function show(string $avisoId): JsonResponse
    {
        $this->authorize('viewAvisos', EducaAnnouncement::class);

        $aviso = $this->announcementService->obter($avisoId);

        return response()->json([
            'data' => $aviso,
        ]);
    }

    public function update(AnnouncementUpdateRequest $request, string $avisoId): JsonResponse
    {
        $this->authorize('manageAvisos', EducaAnnouncement::class);

        try {
            $aviso = $this->announcementService->atualizar($avisoId, $request->validated());

            return response()->json([
                'data' => $aviso,
            ]);
        } catch (LogicException $e) {
            return response()->json([
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    public function destroy(string $avisoId): JsonResponse
    {
        $this->authorize('manageAvisos', EducaAnnouncement::class);

        $this->announcementService->arquivar($avisoId);

        return response()->json([
            'message' => 'Comunicado arquivado com sucesso.',
        ]);
    }

    public function registrarLeitura(Request $request, string $avisoId): JsonResponse
    {
        $this->authorize('viewAvisos', EducaAnnouncement::class);

        $pessoaId = $request->input('pessoa_id');
        $userId = $request->user()?->id;
        $ip = $request->ip();

        $this->announcementService->registrarLeitura($avisoId, $pessoaId ? (int) $pessoaId : null, $userId, $ip);

        return response()->json([
            'message' => 'Leitura registrada com sucesso.',
        ]);
    }
}
