<?php

declare(strict_types=1);

namespace Modules\OrgChart\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

final readonly class OrgExportService
{
    public function __construct(
        private OrgTreeService $treeService,
        private TenantContext $tenantContext,
        private AuditLogger $audit
    ) {}

    /**
     * Exporta o organograma completo em formato JSON com manifest versionado (RN-ORG-010).
     *
     * @return array{
     *   manifest: array<string, mixed>,
     *   tree: array<int, array<string, mixed>>,
     *   units: array<int, array<string, mixed>>,
     *   users: array<int, array<string, mixed>>
     * }
     */
    public function exportJson(): array
    {
        $tenant = $this->tenantContext->get();
        $units = OrgUnit::query()->with(['parent', 'users'])->orderBy('level')->orderBy('order')->get();
        $userLinks = OrgUnitUser::query()->with(['user', 'orgUnit'])->get();
        $tree = $this->treeService->getTree(onlyActive: false);

        $flatUnits = $units->map(fn(OrgUnit $u) => [
            'id' => $u->id,
            'code' => $u->code,
            'name' => $u->name,
            'acronym' => $u->acronym,
            'type' => $u->type,
            'level' => $u->level,
            'path' => $u->path,
            'order' => $u->order,
            'parent_id' => $u->parent_id,
            'parent_code' => $u->parent?->code,
            'is_active' => $u->is_active,
            'inactivation_reason' => $u->inactivation_reason,
            'metadata' => $u->metadata,
            'created_at' => $u->created_at?->toISOString(),
            'updated_at' => $u->updated_at?->toISOString(),
        ])->all();

        $flatUsers = $userLinks->map(fn(OrgUnitUser $link) => [
            'id' => $link->id,
            'org_unit_id' => $link->org_unit_id,
            'org_unit_code' => $link->orgUnit?->code,
            'user_id' => $link->user_id,
            'user_name' => $link->user?->name,
            'user_email' => $link->user?->email,
            'role' => $link->role,
            'is_primary' => $link->is_primary,
            'valid_from' => $link->valid_from?->toDateString(),
            'valid_to' => $link->valid_to?->toDateString(),
            'metadata' => $link->metadata,
        ])->all();

        $manifest = [
            'version' => '1.0.0',
            'schema' => 'sysgov_org_chart',
            'tenant_id' => $tenant->id,
            'tenant_slug' => $tenant->slug,
            'tenant_name' => $tenant->name,
            'generated_at' => now()->toISOString(),
            'total_units' => count($flatUnits),
            'total_user_links' => count($flatUsers),
            'checksum_sha256' => hash('sha256', json_encode($flatUnits) . json_encode($flatUsers)),
        ];

        $this->audit->record(
            'org',
            'chart.exported_json',
            "Tenant #{$tenant->id} ({$tenant->name})",
            null,
            ['total_units' => count($flatUnits), 'manifest_version' => $manifest['version']]
        );

        return [
            'manifest' => $manifest,
            'tree' => $tree,
            'units' => $flatUnits,
            'users' => $flatUsers,
        ];
    }

    /**
     * Exporta a tabela plana de unidades em CSV UTF-8 com BOM para Excel (RN-ORG-010).
     */
    public function exportCsv(): string
    {
        $tenant = $this->tenantContext->get();
        $units = OrgUnit::query()->with('parent')->orderBy('level')->orderBy('order')->get();

        $handle = fopen('php://temp', 'r+');
        if ($handle === false) {
            return '';
        }

        // UTF-8 BOM para abrir corretamente acentos no Excel
        fwrite($handle, "\xEF\xBB\xBF");

        // Cabeçalho CSV
        fputcsv($handle, [
            'ID',
            'Codigo',
            'Nome',
            'Sigla',
            'Tipo',
            'Nivel',
            'Path_Materializado',
            'Ordem',
            'ID_Pai',
            'Codigo_Pai',
            'Nome_Pai',
            'Ativo',
            'Motivo_Inativacao',
            'Data_Criacao',
        ], ';');

        foreach ($units as $unit) {
            fputcsv($handle, [
                $unit->id,
                $unit->code,
                $unit->name,
                $unit->acronym ?? '',
                $unit->type,
                $unit->level,
                $unit->path,
                $unit->order,
                $unit->parent_id ?? '',
                $unit->parent?->code ?? '',
                $unit->parent?->name ?? '',
                $unit->is_active ? 'SIM' : 'NAO',
                $unit->inactivation_reason ?? '',
                $unit->created_at?->format('d/m/Y H:i:s') ?? '',
            ], ';');
        }

        rewind($handle);
        $csvContent = stream_get_contents($handle);
        fclose($handle);

        $this->audit->record(
            'org',
            'chart.exported_csv',
            "Tenant #{$tenant->id} ({$tenant->name})",
            null,
            ['total_units' => $units->count()]
        );

        return (string) $csvContent;
    }
}
