<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class Contract extends Model
{
    use TenantAware;
    protected $fillable = ['number', 'title', 'starts_at', 'ends_at', 'amount_cents', 'status'];
    protected $casts = ['starts_at' => 'date', 'ends_at' => 'date', 'amount_cents' => 'integer'];
    protected static function booted(): void { static::updating(function (self $contract): void { ContractHistory::create(['contract_id' => $contract->getKey(), 'user_id' => auth()->id(), 'action' => 'updated', 'before' => $contract->getOriginal(), 'after' => $contract->getAttributes(), 'created_at' => now()]); }); }
}
