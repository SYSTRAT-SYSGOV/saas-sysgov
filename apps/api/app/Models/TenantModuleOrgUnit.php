<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Admin\Models\Module;
use Modules\OrgChart\Models\OrgUnit;

final class TenantModuleOrgUnit extends Model
{
    protected $table = 'tenant_module_org_unit';

    protected $fillable = [
        'tenant_id',
        'module_id',
        'org_unit_id',
        'enabled',
        'inherited',
        'set_by',
    ];

    protected $casts = [
        'enabled' => 'bool',
        'inherited' => 'bool',
    ];

    /** @return BelongsTo<Module, $this> */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class, 'module_id');
    }

    /** @return BelongsTo<OrgUnit, $this> */
    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    /** @return BelongsTo<User, $this> */
    public function setter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'set_by');
    }

    /** @return BelongsTo<Tenant, $this> */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function scopeExplicit($query)
    {
        return $query->where('inherited', false);
    }

    public function scopeEnabled($query)
    {
        return $query->where('enabled', true);
    }
}
