<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\TenantModuleOrgUnit;
use App\Support\AuditLogger;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Cache;
use Modules\OrgChart\Models\OrgUnit;

/**
 * Serviço de granularidade de módulos por unidade organizacional.
 *
 * RN-GRA-001: Herança por path — liberar para a secretaria inclui os departamentos
 * descendentes (a menos que explicitamente desabilitado em um nível abaixo).
 * Um registro explícito enabled=false em um nível NEGA o módulo para aquele nível
 * E seus descendentes (a menos que um descendente tenha enabled=true explícito).
 */
final class ModuleOrgUnitService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly TenantContext $tenants,
    ) {}

    /**
     * Avalia se o módulo está liberado para a unidade, considerando herança.
     *
     * 1. Busca registro EXPLÍCITO (inherited=false) para a unidade → usa enabled.
     * 2. Se não houver, sobe na hierarquia (ancestrais via path) procurando explícito mais próximo.
     * 3. Se nenhum ancestral tiver, usa tenant_module.enabled como padrão.
     */
    public function isModuleEnabledForUnit(int $tenantId, int $moduleId, int $orgUnitId): bool
    {
        $cacheKey = "module_org_unit:{$tenantId}:{$moduleId}:{$orgUnitId}";

        return Cache::remember($cacheKey, 60, function () use ($tenantId, $moduleId, $orgUnitId): bool {
            $orgUnit = OrgUnit::find($orgUnitId);
            if (!$orgUnit) {
                return false;
            }

            $explicit = TenantModuleOrgUnit::query()
                ->where('tenant_id', $tenantId)
                ->where('module_id', $moduleId)
                ->where('org_unit_id', $orgUnitId)
                ->where('inherited', false)
                ->first();

            if ($explicit) {
                return $explicit->enabled;
            }

            $ancestorPaths = $orgUnit->getAncestorPaths();
            array_pop($ancestorPaths);

            if ($ancestorPaths !== []) {
                $ancestorIds = OrgUnit::query()
                    ->where('tenant_id', $tenantId)
                    ->whereIn('path', $ancestorPaths)
                    ->orderByRaw('LENGTH(path) DESC')
                    ->pluck('id')
                    ->all();

                $ancestorExplicit = TenantModuleOrgUnit::query()
                    ->where('tenant_id', $tenantId)
                    ->where('module_id', $moduleId)
                    ->where('inherited', false)
                    ->whereHas('orgUnit', fn ($q) => $q->whereIn('org_units.path', $ancestorPaths))
                    ->orderByDesc(OrgUnit::selectRaw('LENGTH(org_units.path)')->whereColumn('org_units.id', 'tenant_module_org_unit.org_unit_id'))
                    ->first();

                if ($ancestorExplicit) {
                    return $ancestorExplicit->enabled;
                }
            }

            $tenantEnabled = \Modules\Admin\Models\Module::query()
                ->whereHas('tenants', fn ($q) => $q->where('tenant_module.enabled', true)->where('tenants.id', $tenantId))
                ->where('id', $moduleId)
                ->exists();

            return $tenantEnabled;
        });
    }

    /**
     * Lista todas as unidades (com path) onde o módulo está liberado, considerando herança.
     *
     * @return array<int, array{id: int, name: string, path: string, type: string, level: int, inherited: bool, inherited_from: int|null, inherited_from_name: string|null}>
     */
    public function unitsWithModuleEnabled(int $tenantId, int $moduleId): array
    {
        $orgUnits = OrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->active()
            ->orderBy('path')
            ->get();

        $result = [];

        foreach ($orgUnits as $orgUnit) {
            $enabled = $this->isModuleEnabledForUnit($tenantId, $moduleId, $orgUnit->id);
            if (!$enabled) {
                continue;
            }

            $explicit = TenantModuleOrgUnit::query()
                ->where('tenant_id', $tenantId)
                ->where('module_id', $moduleId)
                ->where('org_unit_id', $orgUnit->id)
                ->where('inherited', false)
                ->exists();

            $inherited = !$explicit;
            $inheritedFrom = null;
            $inheritedFromName = null;

            if ($inherited) {
                $ancestorPaths = $orgUnit->getAncestorPaths();
                array_pop($ancestorPaths);

                if ($ancestorPaths !== []) {
                    $ancestorId = OrgUnit::query()
                        ->where('tenant_id', $tenantId)
                        ->whereIn('path', $ancestorPaths)
                        ->orderByRaw('LENGTH(path) DESC')
                        ->value('id');

                    if ($ancestorId) {
                        $ancestorExplicit = TenantModuleOrgUnit::query()
                            ->where('tenant_id', $tenantId)
                            ->where('module_id', $moduleId)
                            ->where('org_unit_id', $ancestorId)
                            ->where('inherited', false)
                            ->where('enabled', true)
                            ->exists();

                        if ($ancestorExplicit) {
                            $inheritedFrom = $ancestorId;
                            $inheritedFromName = OrgUnit::find($ancestorId)?->name;
                        }
                    }
                }
            }

            $result[] = [
                'id' => $orgUnit->id,
                'name' => $orgUnit->name,
                'path' => $orgUnit->path,
                'type' => $orgUnit->type,
                'level' => $orgUnit->level,
                'inherited' => $inherited,
                'inherited_from' => $inheritedFrom,
                'inherited_from_name' => $inheritedFromName,
            ];
        }

        return $result;
    }

    /**
     * Lista TODAS as unidades organizacionais do tenant com status de habilitação do módulo.
     * Usado pela interface admin de granularidade (ModuleGranularityManager).
     *
     * @return array<int, array{id: int, name: string, path: string, type: string, level: int, enabled: bool, inherited: bool, inherited_from: int|null, inherited_from_name: string|null}>
     */
    public function allUnitsForGranularity(int $tenantId, int $moduleId): array
    {
        $orgUnits = OrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->active()
            ->orderBy('path')
            ->get();

        $result = [];

        foreach ($orgUnits as $orgUnit) {
            $explicit = TenantModuleOrgUnit::query()
                ->where('tenant_id', $tenantId)
                ->where('module_id', $moduleId)
                ->where('org_unit_id', $orgUnit->id)
                ->where('inherited', false)
                ->first();

            $enabled = $explicit ? (bool) $explicit->enabled : false;
            $inherited = false;
            $inheritedFrom = null;
            $inheritedFromName = null;

            if (!$explicit) {
                $ancestorPaths = $orgUnit->getAncestorPaths();
                array_pop($ancestorPaths);

                if ($ancestorPaths !== []) {
                    $ancestorId = OrgUnit::query()
                        ->where('tenant_id', $tenantId)
                        ->whereIn('path', $ancestorPaths)
                        ->orderByRaw("LENGTH(path) DESC")
                        ->value('id');

                    if ($ancestorId) {
                        $ancestorExplicit = TenantModuleOrgUnit::query()
                            ->where('tenant_id', $tenantId)
                            ->where('module_id', $moduleId)
                            ->where('org_unit_id', $ancestorId)
                            ->where('inherited', false)
                            ->where('enabled', true)
                            ->exists();

                        if ($ancestorExplicit) {
                            $inherited = true;
                            $inheritedFrom = $ancestorId;
                            $inheritedFromName = OrgUnit::find($ancestorId)?->name;
                            $enabled = true;
                        }
                    }
                }
            }

            $result[] = [
                'id' => $orgUnit->id,
                'name' => $orgUnit->name,
                'path' => $orgUnit->path,
                'type' => $orgUnit->type,
                'level' => $orgUnit->level,
                'enabled' => $enabled,
                'inherited' => $inherited,
                'inherited_from' => $inheritedFrom,
                'inherited_from_name' => $inheritedFromName,
            ];
        }

        return $result;
    }

    /**
     * Define liberação explícita de módulo para uma unidade (cria ou atualiza).
     */
    public function setModuleForUnit(int $tenantId, int $moduleId, int $orgUnitId, bool $enabled, \App\Models\User $setBy): TenantModuleOrgUnit
    {
        $before = TenantModuleOrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->where('module_id', $moduleId)
            ->where('org_unit_id', $orgUnitId)
            ->first();

        $record = TenantModuleOrgUnit::updateOrCreate(
            ['tenant_id' => $tenantId, 'module_id' => $moduleId, 'org_unit_id' => $orgUnitId],
            [
                'enabled' => $enabled,
                'inherited' => false,
                'set_by' => $setBy->id,
            ]
        );

        $this->audit->record(
            'access',
            $enabled ? 'module.org_unit.enabled' : 'module.org_unit.disabled',
            "tenant:{$tenantId}:module:{$moduleId}:org_unit:{$orgUnitId}",
            $before?->toArray(),
            $record->toArray()
        );

        $this->propagateToDescendants($tenantId, $moduleId, $orgUnitId, $enabled, $setBy);

        Cache::forget("module_org_unit:{$tenantId}:{$moduleId}:{$orgUnitId}");

        return $record;
    }

    /**
     * Remove liberação explícita — volta a herdar do ancestral.
     */
    public function clearModuleForUnit(int $tenantId, int $moduleId, int $orgUnitId, \App\Models\User $setBy): void
    {
        $before = TenantModuleOrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->where('module_id', $moduleId)
            ->where('org_unit_id', $orgUnitId)
            ->first();

        if ($before) {
            $before->delete();
        }

        $this->audit->record(
            'access',
            'module.org_unit.cleared',
            "tenant:{$tenantId}:module:{$moduleId}:org_unit:{$orgUnitId}",
            $before?->toArray(),
            null
        );

        $this->clearDescendants($tenantId, $moduleId, $orgUnitId);

        Cache::forget("module_org_unit:{$tenantId}:{$moduleId}:{$orgUnitId}");
    }

    /**
     * Retorna os módulos efetivamente liberados para uma unidade (com herança aplicada).
     *
     * @return array<int, array{module_id: int, alias: string, name: string, inherited: bool, inherited_from: int|null, inherited_from_name: string|null}>
     */
    public function effectiveModulesForUnit(int $tenantId, int $orgUnitId): array
    {
        $tenantModules = \Modules\Admin\Models\Module::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenant_module.enabled', true)->where('tenants.id', $tenantId))
            ->get();

        $result = [];

        foreach ($tenantModules as $module) {
            $enabled = $this->isModuleEnabledForUnit($tenantId, $module->id, $orgUnitId);
            if (!$enabled) {
                continue;
            }

            $explicit = TenantModuleOrgUnit::query()
                ->where('tenant_id', $tenantId)
                ->where('module_id', $module->id)
                ->where('org_unit_id', $orgUnitId)
                ->where('inherited', false)
                ->exists();

            $inherited = !$explicit;
            $inheritedFrom = null;
            $inheritedFromName = null;

            if ($inherited) {
                $orgUnit = OrgUnit::find($orgUnitId);
                if ($orgUnit) {
                    $ancestorPaths = $orgUnit->getAncestorPaths();
                    array_pop($ancestorPaths);

                    if ($ancestorPaths !== []) {
                        $ancestorId = OrgUnit::query()
                            ->where('tenant_id', $tenantId)
                            ->whereIn('path', $ancestorPaths)
                            ->orderByRaw('LENGTH(path) DESC')
                            ->value('id');

                        if ($ancestorId) {
                            $ancestorExplicit = TenantModuleOrgUnit::query()
                                ->where('tenant_id', $tenantId)
                                ->where('module_id', $module->id)
                                ->where('org_unit_id', $ancestorId)
                                ->where('inherited', false)
                                ->where('enabled', true)
                                ->exists();

                            if ($ancestorExplicit) {
                                $inheritedFrom = $ancestorId;
                                $inheritedFromName = OrgUnit::find($ancestorId)?->name;
                            }
                        }
                    }
                }
            }

            $result[] = [
                'module_id' => $module->id,
                'alias' => $module->alias,
                'name' => $module->name,
                'inherited' => $inherited,
                'inherited_from' => $inheritedFrom,
                'inherited_from_name' => $inheritedFromName,
            ];
        }

        return $result;
    }

    /**
     * Propaga enabled=true/false para todos os descendentes explícitos que herdavam do ancestor.
     */
    private function propagateToDescendants(int $tenantId, int $moduleId, int $orgUnitId, bool $enabled, \App\Models\User $setBy): void
    {
        $ancestor = OrgUnit::find($orgUnitId);
        if (!$ancestor) {
            return;
        }

        $descendants = OrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->where('path', 'like', $ancestor->path . '.%')
            ->pluck('id')
            ->all();

        foreach ($descendants as $descId) {
            $childExplicit = TenantModuleOrgUnit::query()
                ->where('tenant_id', $tenantId)
                ->where('module_id', $moduleId)
                ->where('org_unit_id', $descId)
                ->where('inherited', false)
                ->exists();

            if ($childExplicit) {
                continue;
            }

            TenantModuleOrgUnit::updateOrCreate(
                ['tenant_id' => $tenantId, 'module_id' => $moduleId, 'org_unit_id' => $descId],
                [
                    'enabled' => $enabled,
                    'inherited' => true,
                    'set_by' => $setBy->id,
                ]
            );
        }
    }

    /**
     * Limpa registros herdados dos descendentes que apontavam para o ancestor limpo.
     */
    private function clearDescendants(int $tenantId, int $moduleId, int $orgUnitId): void
    {
        $ancestor = OrgUnit::find($orgUnitId);
        if (!$ancestor) {
            return;
        }

        TenantModuleOrgUnit::query()
            ->where('tenant_id', $tenantId)
            ->where('module_id', $moduleId)
            ->where('inherited', true)
            ->whereHas('orgUnit', fn ($q) => $q->where('path', 'like', $ancestor->path . '.%'))
            ->delete();
    }
}
