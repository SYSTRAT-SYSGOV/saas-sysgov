<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Http\Requests\BatchModuleProvisionRequest;
use Modules\Admin\Http\Requests\ToggleModuleRequest;
use Modules\Admin\Models\Module;

final class ModuleController
{
    use AuthorizesRequests;

    public function index(): JsonResponse { return response()->json(Module::query()->with('tenants:id,name,slug')->orderBy('name')->paginate(50)); }

    public function toggle(ToggleModuleRequest $request, Tenant $tenant, Module $module, AuditLogger $audit): JsonResponse
    {
        $this->authorize('toggle', $module);
        $payload = $request->validated();

        // O módulo "dashboard" é a base do Painel do Cliente (a rota "/" exige
        // ele) — nunca pode ficar desabilitado pra um tenant, senão o usuário
        // cai em "Acesso Negado" assim que loga.
        $enabled = $module->alias === 'dashboard' ? true : (bool) $payload['enabled'];

        $before = $module->tenants()->whereKey($tenant->getKey())->first()?->pivot?->toArray();
        DB::transaction(fn () => $module->tenants()->syncWithoutDetaching([$tenant->getKey() => ['enabled' => $enabled, 'settings' => json_encode($payload['settings'] ?? [])]]));
        $after = $module->tenants()->whereKey($tenant->getKey())->first()?->pivot?->toArray();
        $audit->record('admin', 'module.toggled', 'tenant:'.$tenant->getKey().'/module:'.$module->getKey(), $before, $after);
        return response()->json(['tenant_id' => $tenant->getKey(), 'module_id' => $module->getKey(), 'enabled' => $enabled, 'settings' => $payload['settings'] ?? []]);
    }

    /**
     * Provisiona um módulo em lote para múltiplos tenants.
     */
    public function batchProvision(BatchModuleProvisionRequest $request, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $this->authorize('batchProvision', Module::class);

        $data = $request->validated();
        $tenantIds = $data['tenant_ids'];
        $moduleAlias = $data['module_alias'];
        // Ver nota em toggle(): "dashboard" nunca pode ser desabilitado.
        $enabled = $moduleAlias === 'dashboard' ? true : $data['enabled'];
        $monthlyFeeCents = $data['monthly_fee_cents'] ?? 0;
        $trialEndsAt = $data['trial_ends_at'] ?? null;
        $settings = $data['settings'] ?? [];

        $module = Module::query()->where('alias', $moduleAlias)->firstOrFail();

        $results = DB::transaction(function () use ($tenantIds, $module, $enabled, $monthlyFeeCents, $trialEndsAt, $settings, $audit, $outbox): array {
            $results = [];
            $tenants = Tenant::query()->whereIn('id', $tenantIds)->get()->keyBy('id');

            foreach ($tenantIds as $tenantId) {
                $tenant = $tenants->get($tenantId);
                if (!$tenant) {
                    $results[] = ['tenant_id' => $tenantId, 'success' => false, 'error' => 'Tenant não encontrado'];
                    continue;
                }

                $before = $module->tenants()->whereKey($tenant->getKey())->first()?->pivot?->toArray();

                $pivot = [
                    'enabled' => $enabled,
                    'monthly_fee_cents' => $monthlyFeeCents,
                    'trial_ends_at' => $trialEndsAt,
                    'settings' => json_encode($settings),
                ];

                $module->tenants()->syncWithoutDetaching([$tenant->getKey() => $pivot]);

                $after = $module->tenants()->whereKey($tenant->getKey())->first()?->pivot?->toArray();

                $audit->record('admin', 'module.batch_provisioned', "tenant:{$tenant->getKey()}/module:{$module->getKey()}", $before, $after);

                $outbox->publish('module.batch_provisioned', [
                    'tenant_id' => $tenant->getKey(),
                    'module_alias' => $module->alias,
                    'enabled' => $enabled,
                    'monthly_fee_cents' => $monthlyFeeCents,
                    'trial_ends_at' => $trialEndsAt,
                ], $tenant->getKey());

                $results[] = ['tenant_id' => $tenantId, 'success' => true, 'module_alias' => $module->alias];
            }

            return $results;
        });

        return response()->json(['results' => $results]);
    }
}
