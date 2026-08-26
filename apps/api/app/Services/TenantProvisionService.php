<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Admin\Models\Module;
use Throwable;

/**
 * Provisiona um novo tenant: cria a instância, vincula os módulos selecionados
 * com seus preços e computa o MRR (faturamento recorrente do painel SaaS).
 */
final readonly class TenantProvisionService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
    ) {}

    /**
     * @param array<string, mixed> $data dados validados do tenant
     * @param array<int> $moduleAliases aliases dos módulos a liberar
     */
    public function provision(array $data, array $moduleAliases = []): Tenant
    {
        return DB::transaction(function () use ($data, $moduleAliases): Tenant {
            /** @var array<int, string> $moduleAliases */
            $moduleAliases = array_values(array_unique(array_filter($moduleAliases)));
            $modules = Module::query()->whereIn('alias', $moduleAliases)->get();

            // Libera o módulo "dashboard" por padrão (base do painel)
            if (!in_array('dashboard', $moduleAliases, true)) {
                $dashboard = Module::query()->where('alias', 'dashboard')->first();
                if ($dashboard) {
                    $modules->push($dashboard);
                }
            }

            $tenant = Tenant::create([
                'name' => $data['name'],
                'slug' => $data['slug'],
                'cnpj' => $data['cnpj'] ?? null,
                'type' => $data['type'] ?? 'prefeitura',
                'status' => $data['status'] ?? 'active',
                'domain' => $data['domain'] ?? null,
                'plan' => $data['plan'] ?? 'professional',
                'max_users' => $data['max_users'] ?? 50,
                'storage_limit_mb' => $data['storage_limit_mb'] ?? 10240,
                'monthly_fee_cents' => $data['monthly_fee_cents'] ?? 0,
                'setup_fee_cents' => $data['setup_fee_cents'] ?? 0,
                'custom_domain_enabled' => (bool) ($data['custom_domain_enabled'] ?? false),
                'custom_domain_fee_cents' => (int) ($data['custom_domain_fee_cents'] ?? 0),
                'city' => $data['city'] ?? null,
                'uf' => $data['uf'] ?? null,
                'cnae' => $data['cnae'] ?? null,
                'website' => $data['website'] ?? null,
                'contact_email' => $data['contact_email'] ?? null,
                'settings' => $data['settings'] ?? [],
            ]);

            // Vincula os módulos com preço por tenant (0 = usa o preço base do catálogo)
            $pivot = [];
            foreach ($modules as $module) {
                $pivot[$module->getKey()] = [
                    'enabled' => true,
                    'monthly_fee_cents' => 0,
                    'settings' => json_encode([]),
                ];
            }
            if ($pivot !== []) {
                $tenant->modules()->sync($pivot);
            }

            $this->audit->record('admin', 'tenant.provisioned', "Tenant #{$tenant->id}", null, [
                'tenant_id' => $tenant->id,
                'modules' => $modules->pluck('alias')->all(),
                'mrr_cents' => $tenant->monthlyMrrCents(),
            ]);

            $this->outbox->publish('tenant.provisioned', [
                'tenant_id' => $tenant->id,
                'slug' => $tenant->slug,
                'modules' => $modules->pluck('alias')->all(),
            ], $tenant->id);

            return $tenant->load('modules');
        });
    }
}
