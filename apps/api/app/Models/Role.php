<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Relations\PermissoesDoPerfil;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

final class Role extends Model
{
    protected $fillable = ['name', 'slug', 'scope', 'module', 'description', 'guard_name', 'tenant_id', 'is_system'];

    protected $casts = [
        'is_system' => 'boolean',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_has_permissions');
    }

    /**
     * Edição humana (telas de Perfis): grava exatamente a lista enviada, inclusive removendo as permissões que o
     * `sync()` dos seeders preserva (ver {@see PermissoesDoPerfil}).
     *
     * @param array<int, int|string> $permissionIds
     */
    public function sincronizarPermissoesExato(array $permissionIds): void
    {
        $relacao = $this->permissions();
        if ($relacao instanceof PermissoesDoPerfil) {
            $relacao->syncExato($permissionIds);

            return;
        }

        $relacao->sync($permissionIds);
    }

    /**
     * Devolve a relação própria do perfil (ver {@see PermissoesDoPerfil}): `sync()` dos seeders preserva as
     * permissões que só o administrador atribui.
     *
     * @param \Illuminate\Database\Eloquent\Builder<Model> $query
     * @param Model $parent
     * @param string $table
     * @param string $foreignPivotKey
     * @param string $relatedPivotKey
     * @param string $parentKey
     * @param string $relatedKey
     * @param string|null $relationName
     */
    protected function newBelongsToMany($query, Model $parent, $table, $foreignPivotKey, $relatedPivotKey, $parentKey, $relatedKey, $relationName = null): BelongsToMany
    {
        if ($parent instanceof self && $relationName === 'permissions') {
            // As assinaturas genéricas do Laravel não distinguem a relação própria; o tipo real é a subclasse.
            // @phpstan-ignore argument.type, return.type
            return new PermissoesDoPerfil($query, $parent, $table, $foreignPivotKey, $relatedPivotKey, $parentKey, $relatedKey, $relationName);
        }

        return parent::newBelongsToMany($query, $parent, $table, $foreignPivotKey, $relatedPivotKey, $parentKey, $relatedKey, $relationName); // @phpstan-ignore return.type
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'role_user');
    }

    /**
     * Scope for roles of a specific scope (systrat | tenant)
     *
     * @param Builder<Role> $query
     * @return Builder<Role>
     */
    public function scopeOfScope(Builder $query, string $scope): Builder
    {
        return $query->where('scope', $scope);
    }

    /**
     * Scope for system roles that cannot be deleted
     *
     * @param Builder<Role> $query
     * @return Builder<Role>
     */
    public function scopeSystem(Builder $query): Builder
    {
        return $query->where('is_system', true);
    }
}
