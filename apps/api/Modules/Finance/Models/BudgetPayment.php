<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Modules\OrgChart\Models\OrgUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class BudgetPayment extends Model
{
    use TenantAware;

    protected $table = 'budget_payments';

    protected $fillable = [
        'tenant_id',
        'org_unit_id',
        'settlement_id',
        'payment_number',
        'payment_date',
        'amount_cents',
        'bank_account',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'settlement_id' => 'integer',
        'payment_date' => 'date',
        'amount_cents' => 'integer',
    ];

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(BudgetSettlement::class, 'settlement_id');
    }

    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }
}
