<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Controllers;

use App\Support\OrgScope;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use LogicException;
use Modules\Protocolo\Http\Requests\TramitarProcessoRequest;
use Modules\Protocolo\Models\Processo;
use Modules\Protocolo\Services\TramitacaoService;

final class TramitacaoController extends Controller
{
    public function __construct(
        private readonly TramitacaoService $tramitacaoService,
        private readonly OrgScope $orgScope,
    ) {}

    public function index(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.view')) {
                return response()->json(['message' => 'Sem permissão para visualizar este processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)
                && !$this->orgScope->canAccessOrgUnit($user, $processo->orgao_origem_id)) {
                return response()->json(['message' => 'Processo fora do escopo da sua unidade.'], 403);
            }
        }

        $andamentos = $processo->andamentos()
            ->with(['tipoTramitacao', 'orgaoOrigem', 'orgaoDestino', 'usuario', 'usuarioRecebedor'])
            ->orderBy('sequencia')
            ->get();

        return response()->json($andamentos);
    }

    public function store(TramitarProcessoRequest $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.tramitar')) {
                return response()->json(['message' => 'Sem permissão para tramitar processos.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)) {
                return response()->json(['message' => 'Você não pertence ao órgão detentor deste processo.'], 403);
            }
        }

        try {
            $andamento = $this->tramitacaoService->tramitar(
                processo: $processo,
                orgaoDestinoId: (int) $request->input('orgao_destino_id'),
                tipoTramitacaoId: (int) $request->input('tipo_tramitacao_id'),
                usuarioId: (int) $user?->id,
                descricao: $request->input('descricao'),
                prazoDias: $request->filled('prazo_dias') ? (int) $request->input('prazo_dias') : null,
            );
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $andamento->load(['tipoTramitacao', 'orgaoOrigem', 'orgaoDestino', 'usuario']);

        return response()->json($andamento, 201);
    }

    public function receber(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        $andamentoAtual = $processo->andamentoAtual;

        if ($andamentoAtual === null) {
            return response()->json(['message' => 'Processo sem andamento atual pendente.'], 404);
        }

        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.tramitar') && !$user->hasPermission('protocolo.processos.view')) {
                return response()->json(['message' => 'Sem permissão para confirmar recebimento.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $andamentoAtual->orgao_destino_id)) {
                return response()->json(['message' => 'Apenas usuários do órgão de destino podem confirmar o recebimento.'], 403);
            }
        }

        try {
            $andamento = $this->tramitacaoService->receber(
                processo: $processo,
                usuarioRecebedorId: (int) $user?->id,
                orgaoUsuarioId: $user !== null && !$user->is_platform_admin ? $andamentoAtual->orgao_destino_id : null,
            );
        } catch (LogicException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        $andamento->load(['tipoTramitacao', 'orgaoOrigem', 'orgaoDestino', 'usuario', 'usuarioRecebedor']);

        return response()->json($andamento);
    }

    public function localizacao(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.view') && !$user->hasPermission('protocolo.processos.rastrear')) {
                return response()->json(['message' => 'Sem permissão para rastrear este processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)
                && !$this->orgScope->canAccessOrgUnit($user, $processo->orgao_origem_id)) {
                return response()->json(['message' => 'Processo fora do escopo da sua unidade.'], 403);
            }
        }

        $dados = $this->tramitacaoService->localizacao($processo);

        return response()->json($dados);
    }

    public function permanencia(Request $request, Processo $processo): JsonResponse
    {
        $tenantId = app(TenantContext::class)->id();
        if ($processo->tenant_id !== $tenantId) {
            return response()->json(['message' => 'Processo não encontrado.'], 404);
        }

        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.view')) {
                return response()->json(['message' => 'Sem permissão para visualizar o processo.'], 403);
            }
            if (!$this->orgScope->canAccessOrgUnit($user, $processo->orgao_atual_id)
                && !$this->orgScope->canAccessOrgUnit($user, $processo->orgao_origem_id)) {
                return response()->json(['message' => 'Processo fora do escopo da sua unidade.'], 403);
            }
        }

        $dados = $this->tramitacaoService->permanencia($processo);

        return response()->json($dados);
    }

    public function prazosExcedidos(Request $request): JsonResponse
    {
        $user = $request->user();
        if ($user !== null && !$user->is_platform_admin) {
            if (!$user->hasPermission('protocolo.processos.view') && !$user->hasPermission('protocolo.processos.relatorios')) {
                return response()->json(['message' => 'Acesso não autorizado.'], 403);
            }
        }

        $orgaoId = $request->filled('orgao_id') ? (int) $request->input('orgao_id') : null;

        // Se o usuário tiver restrição de escopo organizacional e não passou órgão específico
        if ($orgaoId === null && $user !== null && !$user->is_platform_admin && !$user->hasPermission('protocolo.processos.relatorios')) {
            $unitIds = $this->orgScope->unitIdsFor($user);
            if ($unitIds !== null && count($unitIds) === 1) {
                $orgaoId = $unitIds[0];
            }
        }

        $itens = $this->tramitacaoService->prazosExcedidos($orgaoId);

        return response()->json($itens);
    }
}
