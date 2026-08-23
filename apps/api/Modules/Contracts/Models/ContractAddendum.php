<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class ContractAddendum extends Model
{
    use TenantAware;

    protected $table = 'contract_addenda';

    protected $fillable = [
        'tenant_id',
        'contract_id',
        'number',
        'reason',
        'amount_cents',
        'effective_at',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contract_id' => 'integer',
        'amount_cents' => 'integer',
        'effective_at' => 'date',
    ];

    public function contract(): BelongsTo
    {
        return $this->belongsTo(Contract::class, 'contract_id');
    }
}
