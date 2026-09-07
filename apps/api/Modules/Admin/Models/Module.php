<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Tenant;
use App\Models\TenantModuleOrgUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Module extends Model
{
    protected $table = 'modules';
    protected $fillable = ['name', 'alias', 'metadata', 'enabled', 'monthly_fee_cents', 'description'];
    protected $casts = [
        'metadata' => 'array',
        'enabled' => 'boolean',
        'monthly_fee_cents' => 'integer',
    ];

    public function tenants(): BelongsToMany
    {
        return $this->belongsToMany(Tenant::class, 'tenant_module')
            ->withPivot(['enabled', 'settings', 'monthly_fee_cents', 'trial_ends_at']);
    }

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(\App\Models\Permission::class, 'module_permission')
            ->withPivot(['module_id']);
    }

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