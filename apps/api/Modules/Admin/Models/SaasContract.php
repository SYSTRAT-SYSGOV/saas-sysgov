<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use App\Models\Concerns\TenantAware;
use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class SaasContract extends Model
{
    use HasFactory;
    use TenantAware;

    protected $table = 'saas_contracts';

    protected static function newFactory(): Factory
    {
        return \Modules\Admin\Database\Factories\SaasContractFactory::new();
    }

    protected $fillable = [
        'tenant_id',
        'number',
        'title',
        'plan',
        'starts_at',
        'ends_at',
        'monthly_fee_cents',
        'setup_fee_cents',
        'renewal_rule',
        'status',
        'cancellation_reason',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'starts_at' => 'date',
        'ends_at' => 'date',
        'monthly_fee_cents' => 'integer',
        'setup_fee_cents' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class);
    }

    public function renewals(): HasMany
    {
        return $this->hasMany(SaasContractRenewal::class, 'saas_contract_id');
    }

    public function adjustments(): HasMany
    {
        return $this->hasMany(SaasContractAdjustment::class, 'saas_contract_id');
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }

    public function isExpired(): bool
    {
        return $this->ends_at?->isPast() ?? false;
    }
}
