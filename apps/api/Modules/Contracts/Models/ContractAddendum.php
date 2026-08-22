<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class ContractAddendum extends Model
{
    use TenantAware;
    protected $fillable = ['contract_id', 'number', 'reason', 'amount_cents', 'effective_at'];
    protected $casts = ['amount_cents' => 'integer', 'effective_at' => 'date'];
}
