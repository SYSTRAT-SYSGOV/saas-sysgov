<?php

declare(strict_types=1);

namespace Modules\OrgChart\Models;

use App\Models\Concerns\TenantAware;
use App\Models\TenantModuleOrgUnit;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Fonte canônica da hierarquia organizacional (RN-ORG-002 / FASE 5).
 * A tabela `org_units` (path materializado + TenantAware) é a autoridade única da árvore.
 * Os models legados Organization/Department/ManagementUnit/BudgetUnit mantêm suas
 * tabelas próprias por compatibilidade, mas NÃO alimentam mais o acesso — o escopo
 * ABAC (OrgScope) e a granularidade por módulo usam exclusivamente OrgUnit.
 *
 * Mapeamento tipo ↔ org_units.type:
 * - prefeitura  → raiz da árvore (level 1)
 * - gabinete    → unidade de apoio direto à prefeitura
 * - secretaria  → organização (antiga Organization)
 * - departamento→ departamento dentro de secretaria (antiga Department)
 * - divisao     → subdivisão de departamento
 * - setor       → nível operacional
 * - autarquia   → entidade descentralizada vinculada ao tenant
 * - fundacao    → entidade descentralizada vinculada ao tenant
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $parent_id
 * @property string $name
 * @property string $code
 * @property string|null $acronym
 * @property string $type
 * @property int $level
 * @property string $path
 * @property int $order
 * @property bool $is_active
 * @property string|null $inactivation_reason
 * @property array|null $metadata
 * @property-read OrgUnit|null $parent
 * @property-read Collection<int, OrgUnit> $children
 */
final class OrgUnit extends Model
{
    use TenantAware;
    use SoftDeletes;

    /** Tipos organizacionais aceitos na árvore canônica (RN-ORG-002). */
    public const TYPES = [
        'prefeitura', 'gabinete', 'secretaria', 'departamento',
        'divisao', 'setor', 'autarquia', 'fundacao',
    ];

    protected $table = 'org_units';

    protected $fillable = [
        'tenant_id',
        'parent_id',
        'name',
        'code',
        'acronym',
        'type',
        'level',
        'path',
        'order',
        'is_active',
        'inactivation_reason',
        'metadata',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'parent_id' => 'integer',
        'level' => 'integer',
        'order' => 'integer',
        'is_active' => 'boolean',
        'metadata' => 'array',
    ];

    /**
     * Unidade pai na hierarquia
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /**
     * Filhos diretos (1º nível abaixo)
     */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('order')->orderBy('name');
    }

    /**
     * Filhos diretos recursivos com sub-árvores
     */
    public function allChildren(): HasMany
    {
        return $this->children()->with('allChildren');
    }

    /**
     * Vínculos na tabela pivô
     */
    public function unitUsers(): HasMany
    {
        return $this->hasMany(OrgUnitUser::class, 'org_unit_id');
    }

    /**
     * Usuários vinculados à unidade
     */
    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'org_unit_user', 'org_unit_id', 'user_id')
            ->withPivot(['id', 'role', 'is_primary', 'valid_from', 'valid_to', 'metadata'])
            ->withTimestamps();
    }

    /**
     * Apenas usuários com papel de responsável (gestor/secretário)
     */
    public function responsibles(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'responsavel');
    }

    /**
     * Apenas usuários com papel de membro
     */
    public function members(): BelongsToMany
    {
        return $this->users()->wherePivot('role', 'membro');
    }

    /**
     * Scope para unidades ativas
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * Scope para unidades raiz (sem pai)
     */
    public function scopeRoots(Builder $query): void
    {
        $query->whereNull('parent_id');
    }

    /**
     * Scope por tipo organizacional
     */
    public function scopeByType(Builder $query, string $type): void
    {
        $query->where('type', $type);
    }

    /**
     * Verifica se a unidade é a raiz do organograma
     */
    public function isRoot(): bool
    {
        return $this->parent_id === null || $this->level === 1;
    }

    /**
     * Verifica se possui filhos
     */
    public function hasChildren(): bool
    {
        return $this->children()->exists();
    }

    /**
     * Retorna todos os descendentes a partir do path materializado
     */
    public function getDescendants(): Collection
    {
        return self::query()
            ->where('path', 'like', "{$this->path}.%")
            ->orderBy('level')
            ->orderBy('order')
            ->get();
    }

    /**
     * Retorna os IDs de todos os descendentes (incluindo o próprio)
     *
     * @return array<int>
     */
    public function getSelfAndDescendantIds(): array
    {
        return self::query()
            ->where(function (Builder $query): void {
                $query->where('id', $this->id)
                    ->orWhere('path', 'like', "{$this->path}.%");
            })
            ->pluck('id')
            ->all();
    }

    /**
     * Retorna os paths de todos os ancestrais a partir do path materializado.
     * Ex.: path = "1.2.3" → ["1", "1.2", "1.2.3"]
     *
     * @return array<string>
     */
    public function getAncestorPaths(): array
    {
        $parts = explode('.', $this->path);
        $paths = [];
        $current = '';

        foreach ($parts as $i => $part) {
            $current .= ($i > 0 ? '.' : '') . $part;
            $paths[] = $current;
        }

        return $paths;
    }

    /** @return HasMany<TenantModuleOrgUnit> */
    public function moduleAccess(): HasMany
    {
        return $this->hasMany(TenantModuleOrgUnit::class, 'org_unit_id');
    }
}
