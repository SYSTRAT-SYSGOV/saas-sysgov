<?php

declare(strict_types=1);

namespace Modules\Finance\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class Transfer extends Model
{
    use TenantAware;

    protected $fillable = ['description', 'amount_cents', 'occurred_at', 'due_at', 'paid_at', 'status', 'contract_id', 'budget_unit_id'];
    protected $casts = ['amount_cents' => 'integer', 'occurred_at' => 'date', 'due_at' => 'date', 'paid_at' => 'date'];
}
