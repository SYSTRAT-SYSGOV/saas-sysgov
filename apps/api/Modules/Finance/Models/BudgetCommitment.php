<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Modules\OrgChart\Models\OrgUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class BudgetCommitment extends Model
{
    use TenantAware;

    protected $table = 'budget_commitments';

    protected $fillable = [
        'tenant_id',
        'org_unit_id',
        'commitment_number',
        'commitment_date',
        'supplier_name',
        'supplier_cnpj',
        'expense_nature',
        'function_code',
        'description',
        'amount_cents',
        'settled_amount_cents',
        'paid_amount_cents',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'commitment_date' => 'date',
        'amount_cents' => 'integer',
        'settled_amount_cents' => 'integer',
        'paid_amount_cents' => 'integer',
    ];

    public function settlements(): HasMany
    {
        return $this->hasMany(BudgetSettlement::class, 'commitment_id')->latest('settlement_date');
    }

    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }

    public function getUnsettledAmountCentsAttribute(): int
    {
        return max(0, $this->amount_cents - $this->settled_amount_cents);
    }
}
