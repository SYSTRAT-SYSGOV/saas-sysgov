<?php

declare(strict_types=1);

namespace Modules\Admin\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class SaasContractAdjustment extends Model
{
    protected $table = 'saas_contract_adjustments';

    protected $fillable = [
        'saas_contract_id',
        'adjusted_at',
        'previous_fee_cents',
        'new_fee_cents',
        'indexer',
        'index_value',
        'reason',
    ];

    protected $casts = [
        'saas_contract_id' => 'integer',
        'adjusted_at' => 'date',
        'previous_fee_cents' => 'integer',
        'new_fee_cents' => 'integer',
        'index_value' => 'float',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(SaasContract::class, 'saas_contract_id');
    }
}
