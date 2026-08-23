<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Contract extends Model
{
    use TenantAware;

    protected $table = 'contracts';

    protected $fillable = [
        'tenant_id',
        'number',
        'title',
        'contract_type',
        'supplier_name',
        'supplier_cnpj',
        'manager_id',
        'inspector_id',
        'starts_at',
        'ends_at',
        'amount_cents',
        'total_addenda_amount_cents',
        'max_addenda_percent',
        'status',
        'renewal_rule',
        'cancellation_reason',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'manager_id' => 'integer',
        'inspector_id' => 'integer',
        'starts_at' => 'date',
        'ends_at' => 'date',
        'amount_cents' => 'integer',
        'total_addenda_amount_cents' => 'integer',
        'max_addenda_percent' => 'float',
    ];

    public function manager(): BelongsTo
    {
        return $this->belongsTo(User::class, 'manager_id');
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspector_id');
    }

    public function addenda(): HasMany
    {
        return $this->hasMany(ContractAddendum::class, 'contract_id')->latest('effective_at');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(ContractAttachment::class, 'contract_id')->latest();
    }

    public function history(): HasMany
    {
        return $this->hasMany(ContractHistory::class, 'contract_id')->latest('created_at');
    }

    public function getEffectiveTotalCentsAttribute(): int
    {
        return $this->amount_cents + $this->total_addenda_amount_cents;
    }

    public function getMaxAllowedAddendaCentsAttribute(): int
    {
        return (int) round(($this->amount_cents * ($this->max_addenda_percent / 100)));
    }
}
