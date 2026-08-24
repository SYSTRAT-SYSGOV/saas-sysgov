<?php

declare(strict_types=1);

namespace Modules\OrgChart\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use LogicException;
use Modules\OrgChart\Models\OrgUnit;

final readonly class OrgTreeService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox,
        private TenantContext $tenantContext
    ) {}

    /**
     * Cria uma nova unidade organizacional calculando level e path materializado em transação.
     *
     * @param array{
     *   name: string,
     *   code: string,
     *   acronym?: string|null,
     *   type?: string,
     *   parent_id?: int|null,
     *   order?: int,
     *   metadata?: array|null
     * } $data
     */
    public function createUnit(array $data): OrgUnit
    {
        return DB::transaction(function () use ($data): OrgUnit {
            $parentId = $data['parent_id'] ?? null;
            $parent = null;

            if ($parentId !== null) {
                /** @var OrgUnit|null $parent */
                $parent = OrgUnit::find($parentId);
                if ($parent === null) {
                    throw new InvalidArgumentException("A unidade pai especificada (ID #{$parentId}) não foi encontrada.");
                }
            } else {
                // RN-ORG-002: Apenas uma raiz por tenant
                $existingRoot = OrgUnit::roots()->first();
                if ($existingRoot !== null) {
                    throw new LogicException('O município já possui uma unidade raiz configurada. Novas secretarias ou órgãos devem estar subordinados à raiz.');
                }
            }

            // RN-ORG-005: Unicidade de nome entre irmãos
            $duplicateName = OrgUnit::query()
                ->where('parent_id', $parentId)
                ->where('name', $data['name'])
                ->exists();

            if ($duplicateName) {
                throw new InvalidArgumentException("Já existe uma unidade com o nome '{$data['name']}' no mesmo nível hierárquico.");
            }

            // Define level inicial
            $level = $parent ? $parent->level + 1 : 1;

            // Define ordem padrão se não informada
            $maxOrder = OrgUnit::query()
                ->where('parent_id', $parentId)
                ->max('order') ?? 0;
            $order = $data['order'] ?? ($maxOrder + 1);

            /** @var OrgUnit $unit */
            $unit = OrgUnit::create([
                'name' => $data['name'],
                'code' => $data['code'],
                'acronym' => $data['acronym'] ?? null,
                'type' => $data['type'] ?? ($parent ? 'secretaria' : 'raiz'),
                'parent_id' => $parentId,
                'level' => $level,
                'path' => 'temp', // será atualizado com o ID criado
                'order' => $order,
                'is_active' => true,
                'metadata' => $data['metadata'] ?? null,
            ]);

            // RN-ORG-006: Atualiza o path materializado oficial
            $path = $parent ? "{$parent->path}.{$unit->id}" : (string) $unit->id;
            $unit->updateQuietly(['path' => $path]);
            $unit->path = $path;

            // Auditoria Imutável (RN-ORG-009)
            $this->audit->record(
                'org',
                'unit.created',
                "OrgUnit #{$unit->id} ({$unit->name})",
                null,
                $unit->toArray()
            );

            // Publicação Outbox
            $this->outbox->publish(
                'OrgUnitCreated',
                [
                    'id' => $unit->id,
                    'code' => $unit->code,
                    'name' => $unit->name,
                    'parent_id' => $unit->parent_id,
                    'path' => $unit->path,
                    'level' => $unit->level,
                ]
            );

            return $unit;
        });
    }

    /**
     * Atualiza dados de uma unidade organizacional existente.
     *
     * @param array{
     *   name?: string,
     *   code?: string,
     *   acronym?: string|null,
     *   type?: string,
     *   metadata?: array|null
     * } $data
     */
    public function updateUnit(OrgUnit $unit, array $data): OrgUnit
    {
        return DB::transaction(function () use ($unit, $data): OrgUnit {
            $before = $unit->toArray();

            if (isset($data['name']) && $data['name'] !== $unit->name) {
                $duplicate = OrgUnit::query()
                    ->where('parent_id', $unit->parent_id)
                    ->where('name', $data['name'])
                    ->where('id', '!=', $unit->id)
                    ->exists();

                if ($duplicate) {
                    throw new InvalidArgumentException("Já existe uma unidade com o nome '{$data['name']}' no mesmo nível hierárquico.");
                }
            }

            $unit->update($data);

            $this->audit->record(
                'org',
                'unit.updated',
                "OrgUnit #{$unit->id} ({$unit->name})",
                $before,
                $unit->fresh()->toArray()
            );

            $this->outbox->publish(
                'OrgUnitUpdated',
                [
                    'id' => $unit->id,
                    'name' => $unit->name,
                    'code' => $unit->code,
                ]
            );

            return $unit;
        });
    }

    /**
     * Move uma unidade para um novo pai hierárquico com validação anti-ciclos (RN-ORG-003)
     * e recálculo em cascata do path e level de toda a subárvore (RN-ORG-006).
     */
    public function moveUnit(OrgUnit $unit, ?int $newParentId, ?int $newOrder = null): OrgUnit
    {
        return DB::transaction(function () use ($unit, $newParentId, $newOrder): OrgUnit {
            // RN-ORG-002: A raiz não pode ser movida para ter pai
            if ($unit->isRoot() && $newParentId !== null) {
                throw new LogicException('A unidade raiz municipal não pode ser movida para baixo de outra unidade.');
            }

            if ($newParentId === $unit->id) {
                throw new InvalidArgumentException('Uma unidade não pode ser pai de si mesma.');
            }

            $before = $unit->toArray();
            $newParent = null;

            if ($newParentId !== null) {
                /** @var OrgUnit|null $newParent */
                $newParent = OrgUnit::find($newParentId);
                if ($newParent === null) {
                    throw new InvalidArgumentException("Unidade destino #{$newParentId} não encontrada.");
                }

                // RN-ORG-003: Prevenção de Ciclos
                // O novo pai NÃO pode ser um descendente da unidade que está sendo movida
                if ($newParent->id === $unit->id || str_starts_with($newParent->path, "{$unit->path}.")) {
                    throw new InvalidArgumentException("Movimento inválido: a unidade destino '{$newParent->name}' é descendente de '{$unit->name}'. Criar este vínculo geraria um ciclo hierárquico proibido.");
                }
            } else {
                // Tentando tornar raiz
                $existingRoot = OrgUnit::roots()->where('id', '!=', $unit->id)->first();
                if ($existingRoot !== null) {
                    throw new LogicException('Não é permitido criar uma segunda unidade raiz.');
                }
            }

            $oldPath = $unit->path;
            $newLevel = $newParent ? $newParent->level + 1 : 1;
            $newPath = $newParent ? "{$newParent->path}.{$unit->id}" : (string) $unit->id;
            $order = $newOrder ?? ($unit->order);

            // Atualiza a unidade movida
            $unit->updateQuietly([
                'parent_id' => $newParentId,
                'level' => $newLevel,
                'path' => $newPath,
                'order' => $order,
            ]);

            // RN-ORG-006: Atualiza toda a subárvore de descendentes
            $levelDiff = $newLevel - $unit->getOriginal('level');
            $descendants = OrgUnit::query()
                ->where('path', 'like', "{$oldPath}.%")
                ->get();

            foreach ($descendants as $descendant) {
                $subPathSuffix = substr($descendant->path, strlen($oldPath));
                $updatedPath = $newPath . $subPathSuffix;
                $updatedLevel = $descendant->level + $levelDiff;

                $descendant->updateQuietly([
                    'path' => $updatedPath,
                    'level' => $updatedLevel,
                ]);
            }

            $this->audit->record(
                'org',
                'unit.moved',
                "OrgUnit #{$unit->id} ({$unit->name})",
                $before,
                [
                    'parent_id' => $newParentId,
                    'old_path' => $oldPath,
                    'new_path' => $newPath,
                    'level' => $newLevel,
                ]
            );

            $this->outbox->publish(
                'OrgUnitMoved',
                [
                    'id' => $unit->id,
                    'new_parent_id' => $newParentId,
                    'new_path' => $newPath,
                    'new_level' => $newLevel,
                ]
            );

            return $unit->fresh();
        });
    }

    /**
     * Remove ou inativa uma unidade organizacional (RN-ORG-004).
     */
    public function deleteUnit(OrgUnit $unit, ?string $reason = null): bool
    {
        return DB::transaction(function () use ($unit, $reason): bool {
            // RN-ORG-002: Raiz não pode ser excluída
            if ($unit->isRoot()) {
                throw new LogicException('A unidade raiz municipal não pode ser excluída.');
            }

            // Se possuir sub-unidades filhas ativas, exige inativação ou remoção prévia das filhas
            if ($unit->hasChildren()) {
                // Inativa a unidade e filhas (RN-ORG-004)
                $unit->update([
                    'is_active' => false,
                    'inactivation_reason' => $reason ?? 'Inativação da estrutura com sub-unidades subordinadas.',
                ]);

                $this->audit->record(
                    'org',
                    'unit.inactivated',
                    "OrgUnit #{$unit->id} ({$unit->name})",
                    ['is_active' => true],
                    ['is_active' => false, 'reason' => $reason]
                );

                return true;
            }

            // Exclusão física/soft delete permitida se não possuir dependências
            $before = $unit->toArray();
            $unit->delete();

            $this->audit->record(
                'org',
                'unit.deleted',
                "OrgUnit #{$unit->id} ({$unit->name})",
                $before,
                null
            );

            $this->outbox->publish(
                'OrgUnitDeleted',
                ['id' => $unit->id, 'name' => $unit->name]
            );

            return true;
        });
    }

    /**
     * Retorna a árvore organizacional completa aninhada para o frontend.
     *
     * @return array<int, array<string, mixed>>
     */
    public function getTree(?int $rootId = null, bool $onlyActive = true): array
    {
        $query = OrgUnit::query()
            ->with(['users', 'parent'])
            ->orderBy('level')
            ->orderBy('order')
            ->orderBy('name');

        if ($onlyActive) {
            $query->where('is_active', true);
        }

        if ($rootId !== null) {
            /** @var OrgUnit|null $root */
            $root = OrgUnit::find($rootId);
            if ($root === null) {
                return [];
            }
            $units = OrgUnit::query()
                ->where(function ($q) use ($root): void {
                    $q->where('id', $root->id)
                        ->orWhere('path', 'like', "{$root->path}.%");
                })
                ->when($onlyActive, fn($q) => $q->where('is_active', true))
                ->with(['users'])
                ->orderBy('level')
                ->orderBy('order')
                ->get();
        } else {
            $units = $query->get();
        }

        return $this->buildNestedTree($units);
    }

    /**
     * Monta a estrutura aninhada a partir de uma coleção plana
     *
     * @param Collection<int, OrgUnit> $units
     * @return array<int, array<string, mixed>>
     */
    private function buildNestedTree(Collection $units, ?int $parentId = null): array
    {
        $branch = [];

        foreach ($units as $unit) {
            if ($unit->parent_id === $parentId) {
                $children = $this->buildNestedTree($units, $unit->id);
                $node = [
                    'id' => $unit->id,
                    'tenant_id' => $unit->tenant_id,
                    'parent_id' => $unit->parent_id,
                    'name' => $unit->name,
                    'code' => $unit->code,
                    'acronym' => $unit->acronym,
                    'type' => $unit->type,
                    'level' => $unit->level,
                    'path' => $unit->path,
                    'order' => $unit->order,
                    'is_active' => $unit->is_active,
                    'inactivation_reason' => $unit->inactivation_reason,
                    'metadata' => $unit->metadata,
                    'users_count' => $unit->users->count(),
                    'responsibles' => $unit->responsibles->map(fn($u) => [
                        'id' => $u->id,
                        'name' => $u->name,
                        'email' => $u->email,
                        'role' => 'responsavel',
                    ])->values()->all(),
                    'children' => $children,
                ];
                $branch[] = $node;
            }
        }

        return $branch;
    }
}
