<?php

declare(strict_types=1);

namespace Modules\OrgChart\Services;

use App\Models\Tenant;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Modules\OrgChart\Models\OrgUnit;
use RuntimeException;

/**
 * Semeadura da estrutura organizacional padrão de um município (Gabinete + Secretarias).
 * Usado pelo web-admin (onboarding SYSTRAT) e pelo web-client (admin_tenant).
 */
final class OrgSeedService
{
    public function __construct(
        private readonly OrgTreeService $treeService,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Se o tenant já possui raiz, retorna true (não semeia de novo).
     */
    public function hasRoot(): bool
    {
        return OrgUnit::roots()->exists();
    }

    /**
     * Semeia a estrutura padrão municipal no tenant do TenantContext ativo.
     *
     * @return array{root: OrgUnit, sec_admin: OrgUnit, sec_financas: OrgUnit}
     */
    public function seedDefaultMunicipalStructure(Tenant $tenant): array
    {
        if (OrgUnit::roots()->exists()) {
            throw new RuntimeException('O tenant já possui um organograma inicial cadastrado.');
        }

        app(TenantContext::class)->set($tenant);

        $root = $this->treeService->createUnit([
            'name' => "Gabinete do Prefeito — {$tenant->name}",
            'code' => 'GAB',
            'acronym' => 'GAB',
            'type' => 'raiz',
            'metadata' => ['description' => 'Órgão executivo superior da administração municipal.', 'seeded_by' => 'SYSGOV Onboarding Engine'],
        ]);

        $secAdmin = $this->treeService->createUnit([
            'name' => 'Secretaria Municipal de Administração',
            'code' => 'SMA',
            'acronym' => 'SMA',
            'type' => 'secretaria',
            'parent_id' => $root->id,
            'metadata' => ['description' => 'Gestão administrativa, patrimônio e compras públicas.'],
        ]);

        $secFinancas = $this->treeService->createUnit([
            'name' => 'Secretaria Municipal de Finanças & Planejamento',
            'code' => 'SMF',
            'acronym' => 'SMF',
            'type' => 'secretaria',
            'parent_id' => $root->id,
            'metadata' => ['description' => 'Execução orçamentária, contabilidade e arrecadação.'],
        ]);

        $this->audit->record('org', 'onboarding.seeded', "Tenant #{$tenant->id} ({$tenant->name})", null, [
            'root_id' => $root->id,
            'sec_admin_id' => $secAdmin->id,
            'sec_financas_id' => $secFinancas->id,
        ]);

        return ['root' => $root, 'sec_admin' => $secAdmin, 'sec_financas' => $secFinancas];
    }
}
