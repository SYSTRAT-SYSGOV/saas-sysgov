<?php

declare(strict_types=1);

namespace Modules\Procurement\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Services\ModuleAccessService;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Services\AuditHMACService;
use Modules\Procurement\Services\LegalDeadlinesService;

final class LicitacaoController extends Controller
{
    public function __construct(
        private readonly AuditHMACService $audit,
        private readonly OutboxPublisher $outbox,
        private readonly LegalDeadlinesService $deadlines,
        private readonly ModuleAccessService $access,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Licitacao::query()
            ->with(['orgUnit', 'creator'])
            ->withCount(['artefatos', 'precos', 'participantes', 'lances', 'contratos']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('modalidade')) {
            $query->where('modalidade', $request->query('modalidade'));
        }

        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->query('ano'));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($term): void {
                $q->where('numero', 'like', $term)
                  ->orWhere('objeto', 'like', $term)
                  ->orWhere('fundamento_legal', 'like', $term);
            });
        }

        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        $scopedBase = Licitacao::query();
        $this->access->scopeQuery($scopedBase, $user, 'procurement', $tenantId);

        $query = (clone $scopedBase)
            ->with(['orgUnit', 'creator'])
            ->withCount(['artefatos', 'precos', 'participantes', 'lances', 'contratos']);

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('modalidade')) {
            $query->where('modalidade', $request->query('modalidade'));
        }

        if ($request->filled('ano')) {
            $query->where('ano', (int) $request->query('ano'));
        }

        if ($request->filled('search')) {
            $term = '%' . $request->query('search') . '%';
            $query->where(function ($q) use ($term): void {
                $q->where('numero', 'like', $term)
                  ->orWhere('objeto', 'like', $term)
                  ->orWhere('fundamento_legal', 'like', $term);
            });
        }

        $licitacoes = $query->orderBy('id', 'desc')->paginate(20);

        $totalProcessos = (clone $scopedBase)->count();
        $valorEstimadoTotal = (int) (clone $scopedBase)->sum('valor_estimado_cents');
        $emDisputaCount = (clone $scopedBase)->whereIn('status', ['publicada', 'em_disputa'])->count();
        $homologadasCount = (clone $scopedBase)->where('status', 'homologada')->count();

        return response()->json([
            'data' => $licitacoes->items(),
            'meta' => [
                'current_page' => $licitacoes->currentPage(),
                'last_page' => $licitacoes->lastPage(),
                'total' => $licitacoes->total(),
            ],
            'kpis' => [
                'total_processos' => $totalProcessos,
                'valor_estimado_total_cents' => $valorEstimadoTotal,
                'em_disputa_count' => $emDisputaCount,
                'homologadas_count' => $homologadasCount,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        $validated = $request->validate([
            'numero' => ['required', 'string', 'max:50'],
            'ano' => ['nullable', 'integer', 'min:2020', 'max:2035'],
            'modalidade' => ['required', 'string', 'in:pregao_eletronico,concorrencia,concurso,leilao,dialogo_competitivo,dispensa_eletronica,inexigibilidade'],
            'objeto' => ['required', 'string', 'min:10'],
            'criterio_julgamento' => ['nullable', 'string', 'in:menor_preco,maior_desconto,melhor_tecnica,tecnica_e_preco,maior_lance,maior_retorno_economico'],
            'regime_execucao' => ['nullable', 'string'],
            'valor_estimado_cents' => ['nullable', 'integer', 'min:0'],
            'org_unit_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'srp' => ['nullable', 'boolean'],
            'exclusivo_me_epp' => ['nullable', 'boolean'],
            'data_abertura' => ['nullable', 'date'],
        ]);

        if (isset($validated['org_unit_id'])) {
            $allowedIds = $this->access->allowedOrgUnitIds($user, 'procurement', $tenantId);
            if ($allowedIds !== null && !in_array($validated['org_unit_id'], $allowedIds, true)) {
                return response()->json(['error' => 'Unidade organizacional não permitida.'], 403);
            }
        } else {
            $linkedIds = \Modules\OrgChart\Models\OrgUnitUser::query()
                ->where('user_id', $user->id)
                ->where('tenant_id', $tenantId)
                ->pluck('org_unit_id')
                ->first();
            if ($linkedIds) {
                $validated['org_unit_id'] = is_array($linkedIds) ? ($linkedIds[0] ?? null) : $linkedIds;
            }
        }

        $validated['ano'] = $validated['ano'] ?? (int) date('Y');
        $validated['status'] = 'rascunho';
        $validated['created_by'] = $user?->id;

        $licitacao = Licitacao::create($validated);

        // Auditoria HMAC encadeada
        $this->audit->record(
            'procurement',
            'licitacao.created',
            "Licitação #{$licitacao->id} ({$licitacao->numero})",
            null,
            $licitacao->toArray()
        );

        $this->outbox->publish('procurement', 'ProcurementCreated', [
            'id' => $licitacao->id,
            'numero' => $licitacao->numero,
            'objeto' => $licitacao->objeto,
        ]);

        return response()->json($licitacao, 201);
    }

    public function show(int $id, Request $request): JsonResponse
    {
        $user = $request->user();
        $tenantId = (int) app(\App\Support\TenantContext::class)->id();

        $query = Licitacao::query()
            ->with([
                'orgUnit',
                'creator',
                'homologador',
                'artefatos.creator',
                'artefatos.aprovador',
                'precos',
                'participantes',
                'pareceres.parecerista',
                'pareceres.aprovador',
                'contratos',
            ]);

        $query = $this->access->scopeQuery($query, $user, 'procurement', $tenantId);

        $licitacao = $query->findOrFail($id);

        $deadlinesInfo = $this->deadlines->calculateMinimumOpeningDate($licitacao);

        return response()->json([
            'licitacao' => $licitacao,
            'deadlines' => $deadlinesInfo,
        ]);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);

        if (!in_array($licitacao->status, ['rascunho', 'em_fase_interna'], true)) {
            return response()->json(['message' => 'Apenas licitações em rascunho ou fase interna podem ser alteradas.'], 422);
        }

        $validated = $request->validate([
            'numero' => ['sometimes', 'string', 'max:50'],
            'objeto' => ['sometimes', 'string', 'min:10'],
            'modalidade' => ['sometimes', 'string'],
            'criterio_julgamento' => ['sometimes', 'string'],
            'regime_execucao' => ['sometimes', 'string'],
            'valor_estimado_cents' => ['sometimes', 'integer', 'min:0'],
            'org_unit_id' => ['nullable', 'integer', 'exists:org_units,id'],
            'srp' => ['sometimes', 'boolean'],
            'exclusivo_me_epp' => ['sometimes', 'boolean'],
            'data_abertura' => ['nullable', 'date'],
        ]);

        $before = $licitacao->toArray();
        $licitacao->update($validated);

        $this->audit->record(
            'procurement',
            'licitacao.updated',
            "Licitação #{$licitacao->id} ({$licitacao->numero})",
            $before,
            $licitacao->toArray()
        );

        return response()->json($licitacao);
    }

    public function destroy(int $id): JsonResponse
    {
        $licitacao = Licitacao::findOrFail($id);

        if ($licitacao->status !== 'rascunho') {
            return response()->json(['message' => 'Apenas processos em rascunho podem ser excluídos.'], 422);
        }

        $before = $licitacao->toArray();
        $licitacao->delete();

        $this->audit->record(
            'procurement',
            'licitacao.deleted',
            "Licitação #{$id} ({$before['numero']})",
            $before,
            null
        );

        return response()->json(['message' => 'Processo licitatório excluído com sucesso.']);
    }

    /**
     * Exportação de dados estruturados para controle externo (TCE/TCU)
     */
    public function export(Request $request): JsonResponse
    {
        $licitacoes = Licitacao::query()
            ->with(['artefatos', 'precos', 'participantes', 'contratos.aditivos'])
            ->get();

        $this->audit->record(
            'procurement',
            'procurement.exported',
            'Exportação Completa de Licitações (TCE/TCU)',
            null,
            ['count' => $licitacoes->count()]
        );

        return response()->json([
            'tenant_id' => app(\App\Support\TenantContext::class)->id(),
            'exported_at' => now()->toIso8601String(),
            'version' => '1.0',
            'data' => $licitacoes,
        ]);
    }
}
