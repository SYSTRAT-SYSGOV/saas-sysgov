<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class BudgetPayment extends Model
{
    use TenantAware;

    protected $table = 'budget_payments';

    protected $fillable = [
        'tenant_id',
        'settlement_id',
        'payment_number',
        'payment_date',
        'amount_cents',
        'bank_account',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'settlement_id' => 'integer',
        'payment_date' => 'date',
        'amount_cents' => 'integer',
    ];

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(BudgetSettlement::class, 'settlement_id');
    }
}
