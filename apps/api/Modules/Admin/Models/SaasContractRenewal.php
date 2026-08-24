<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SaasContractRenewal extends Model
{
    protected $table = 'saas_contract_renewals';

    protected $fillable = [
        'saas_contract_id',
        'renewed_at',
        'previous_ends_at',
        'new_ends_at',
        'monthly_fee_cents',
        'notes',
    ];

    protected $casts = [
        'saas_contract_id' => 'integer',
        'renewed_at' => 'date',
        'previous_ends_at' => 'date',
        'new_ends_at' => 'date',
        'monthly_fee_cents' => 'integer',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SaasContract::class, 'saas_contract_id');
    }
}
