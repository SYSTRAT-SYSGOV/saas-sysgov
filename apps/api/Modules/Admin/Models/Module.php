<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

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
}
