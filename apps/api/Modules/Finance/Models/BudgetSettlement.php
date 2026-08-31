<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Modules\OrgChart\Models\OrgUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class BudgetSettlement extends Model
{
    use TenantAware;

    protected $table = 'budget_settlements';

    protected $fillable = [
        'tenant_id',
        'org_unit_id',
        'commitment_id',
        'settlement_number',
        'settlement_date',
        'invoice_number',
        'amount_cents',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'commitment_id' => 'integer',
        'settlement_date' => 'date',
        'amount_cents' => 'integer',
    ];

    public function commitment(): BelongsTo
    {
        return $this->belongsTo(BudgetCommitment::class, 'commitment_id');
    }

    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(BudgetPayment::class, 'settlement_id')->latest('payment_date');
    }
}
