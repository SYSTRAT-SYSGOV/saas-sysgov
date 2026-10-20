<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Services\CnpjService;
use App\Services\TenantSummary;
use App\Services\TenantProvisionService;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Http\Requests\StoreTenantRequest;
use Modules\Admin\Http\Requests\UpdateTenantRequest;

final class TenantController
{
    use AuthorizesRequests;

    /** Campos aceitos em `sort` (lista branca — nunca interpolar entrada do usuário na query). */
    private const SORTABLE = ['name', 'slug', 'status', 'type', 'plan', 'created_at', 'monthly_fee_cents'];

    private const MAX_PER_PAGE = 100;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Tenant::class);

        // Escopo + filtros (compartilhados entre a página e os totais do conjunto filtrado)
        $base = Tenant::query();

        // Analista de suporte: vê apenas a carteira de clientes liberada (tenant_analyst)
        $base->forUser($request->user());

        if ($type = $request->string('type')->toString()) {
            $base->where('type', $type);
        }

        if ($status = $request->string('status')->toString()) {
            $base->where('status', $status);
        }

        if ($search = $request->string('q')->toString()) {
            $base->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('slug', 'like', "%{$search}%")
                  ->orWhere('cnpj', 'like', "%{$search}%")
                  ->orWhere('domain', 'like', "%{$search}%");
            });
        }

        $summary = (new TenantSummary())->for($base);

        $sort = $request->string('sort')->toString();
        $sort = in_array($sort, self::SORTABLE, true) ? $sort : 'created_at';
        $direction = strtolower($request->string('direction')->toString()) === 'asc' ? 'asc' : 'desc';
        $perPage = $request->integer('per_page', 25);
        $perPage = $perPage < 1 ? 25 : min($perPage, self::MAX_PER_PAGE);

        $paginator = (clone $base)
            ->with('modules:id,alias,name,monthly_fee_cents')
            ->withCount('users')
            ->orderBy($sort, $direction)
            ->orderByDesc('id')
            ->paginate($perPage)
            ->through(fn (Tenant $tenant): array => array_merge($tenant->toArray(), [
                'mrr_cents' => $tenant->monthlyMrrCents(),
                'user_count' => (int) $tenant->getAttribute('users_count'),
            ]));

        return response()->json(array_merge($paginator->toArray(), [
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'summary' => $summary,
            ],
        ]));
    }

    public function show(Tenant $tenant): JsonResponse
    {
        $this->authorize('view', $tenant);

        // Analista precisa ter o tenant na carteira (e o vínculo ativo)
        $user = request()->user();
        if ($user && $user->isSupportAnalyst() && !$user->is_platform_admin) {
            $linked = \App\Models\TenantAnalyst::where('user_id', $user->id)
                ->where('tenant_id', $tenant->id)
                ->where(fn ($w) => $w->whereNull('expires_at')->orWhere('expires_at', '>', now()))
                ->exists();

            abort_unless($linked, 403, 'Este cliente não está liberado para o seu acesso.');
        }

        $tenant->load('modules:id,alias,name,monthly_fee_cents');

        return response()->json([
            'data' => array_merge($tenant->toArray(), [
                'mrr_cents' => $tenant->monthlyMrrCents(),
                'modules_monthly_total_cents' => $tenant->modulesMonthlyTotalCents(),
                'user_count' => $tenant->users()->count(),
                'users_percent' => $tenant->max_users > 0 ? min(100, round(($tenant->users()->count() / $tenant->max_users) * 100)) : 0,
            ]),
        ]);
    }

    /**
     * Provisiona um novo tenant com módulos e preços (MRR).
     */
    public function store(StoreTenantRequest $request, TenantProvisionService $provision, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $this->authorize('create', Tenant::class);

        $data = $request->validated();
        $moduleAliases = $data['modules'] ?? [];
        unset($data['modules']);

        $tenant = $provision->provision($data, $moduleAliases);

        return response()->json([
            'data' => array_merge($tenant->toArray(), ['mrr_cents' => $tenant->monthlyMrrCents()]),
        ], 201);
    }

    public function update(UpdateTenantRequest $request, Tenant $tenant, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $tenant);

        $before = $tenant->fresh(['modules'])->toArray();

        $data = $request->validated();
        $moduleAliases = $data['modules'] ?? null;
        unset($data['modules']);

        $tenant->update($data);

        if ($moduleAliases !== null) {
            // Libera o módulo "dashboard" por padrão (base do painel) — mesma regra
            // de TenantProvisionService::provision(). O front nem mostra esse módulo
            // na lista de checkboxes, então sem isso o sync() abaixo o removia do
            // tenant sempre que os módulos eram editados, deixando o Painel do
            // Cliente inteiro inacessível (a rota "/" exige o módulo "dashboard").
            // O mesmo vale para os demais módulos de base ("users"): fora da lista, o sync() os removeria.
            foreach (\Modules\Admin\Models\Module::BASE as $alias) {
                if (!in_array($alias, $moduleAliases, true)) {
                    $moduleAliases[] = $alias;
                }
            }

            $modules = \Modules\Admin\Models\Module::query()->whereIn('alias', $moduleAliases)->get();
            $pivot = [];
            foreach ($modules as $module) {
                $pivot[$module->getKey()] = ['enabled' => true, 'monthly_fee_cents' => 0, 'settings' => json_encode([])];
            }
            $tenant->modules()->sync($pivot);
        }

        $audit->record('admin', 'updated', 'tenant:'.$tenant->getKey(), $before, $tenant->fresh(['modules'])->toArray());

        $updated = $tenant->fresh(['modules']);

        return response()->json(['data' => array_merge($updated->toArray(), ['mrr_cents' => $updated->monthlyMrrCents()])]);
    }

    public function toggleStatus(Request $request, Tenant $tenant, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $tenant);

        $data = $request->validate([
            'status' => ['required', 'in:active,suspended,trial'],
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        $before = $tenant->toArray();
        $tenant->update(['status' => $data['status']]);

        $audit->record('admin', 'status_changed', 'tenant:'.$tenant->getKey(), $before, [
            'status' => $tenant->status,
            'reason' => $data['reason'] ?? null,
        ]);

        return response()->json($tenant->fresh());
    }

    public function destroy(Tenant $tenant, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $this->authorize('delete', $tenant);

        $snapshot = $tenant->toArray();
        $tenantId = $tenant->getKey();
        $tenant->delete();

        $audit->record('admin', 'deleted', 'tenant:'.$tenantId, $snapshot, null);

        // tenant_id null após a exclusão (FK onDelete: SET NULL)
        $outbox->publish('tenant.deleted', ['tenant_id' => $tenantId, 'slug' => $snapshot['slug'] ?? null], null);

        return response()->json(null, 204);
    }

    /**
     * Consulta os dados da organização pelo CNPJ (BrasilAPI) para autopreenchimento.
     * GET /api/admin/cnpj/{cnpj}
     */
    public function lookupCnpj(CnpjService $cnpj, string $cnpjNumber): JsonResponse
    {
        $this->authorize('create', Tenant::class);

        $data = $cnpj->lookup($cnpjNumber);

        if ($data === null) {
            return response()->json(['message' => 'CNPJ inválido ou não encontrado na base pública.'], 404);
        }

        return response()->json(['data' => $data]);
    }
}
