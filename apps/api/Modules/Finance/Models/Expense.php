<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Modules\OrgChart\Models\OrgUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class Expense extends Model
{
    use TenantAware;

    protected $fillable = ['tenant_id', 'org_unit_id', 'description', 'amount_cents', 'occurred_at', 'due_at', 'paid_at', 'status', 'contract_id', 'budget_unit_id'];
    protected $casts = ['amount_cents' => 'integer', 'occurred_at' => 'date', 'due_at' => 'date', 'paid_at' => 'date', 'org_unit_id' => 'integer'];

    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(OrgUnit::class, 'org_unit_id');
    }
}
