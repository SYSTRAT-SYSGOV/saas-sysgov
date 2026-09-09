<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Tenant;
use App\Models\TenantModuleOrgUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property string $name
 * @property string $alias
 * @property int|null $menu_group_id
 * @property array<string, mixed>|null $metadata
 * @property bool $enabled
 * @property int $monthly_fee_cents
 * @property string|null $description
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read MenuGroup|null $menuGroup
 */
final class Module extends Model
{
    protected $table = 'modules';
    protected $fillable = ['name', 'alias', 'metadata', 'enabled', 'monthly_fee_cents', 'description'];
    protected $casts = [
        'metadata' => 'array',
        'enabled' => 'boolean',
        'monthly_fee_cents' => 'integer',
    ];

    /** @return BelongsToMany<Tenant, $this> */
    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_module')
            ->withPivot(['enabled', 'settings', 'monthly_fee_cents', 'trial_ends_at']);
    }

    /** @return BelongsToMany<\App\Models\Permission, $this> */
    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\Permission::class, 'module_permission')
            ->withPivot(['module_id']);
    }

    /** @return BelongsTo<MenuGroup, $this> */
    public function menuGroup(): BelongsTo
    {
        return $this->belongsTo(MenuGroup::class, 'menu_group_id');
    }

    /** @return HasMany<TenantModuleOrgUnit> */
    public function orgUnits(): HasMany
    {
        return $this->hasMany(TenantModuleOrgUnit::class, 'module_id');
    }
}