<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class BudgetUnit extends Model
{
    use TenantAware;
    protected $fillable = ['management_unit_id', 'name', 'code'];
    public function managementUnit(): BelongsTo { return $this->belongsTo(ManagementUnit::class); }
}
