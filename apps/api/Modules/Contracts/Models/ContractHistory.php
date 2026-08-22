<?php

declare(strict_types=1);

namespace Modules\Contracts\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class ContractHistory extends Model
{
    use TenantAware;
    public $timestamps = false;
    protected $fillable = ['contract_id', 'user_id', 'action', 'before', 'after', 'created_at'];
    protected $casts = ['before' => 'array', 'after' => 'array', 'created_at' => 'datetime'];
}
