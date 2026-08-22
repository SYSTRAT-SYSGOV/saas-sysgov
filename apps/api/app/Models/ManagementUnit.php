<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class ManagementUnit extends Model
{
    use TenantAware;
    protected $fillable = ['department_id', 'name', 'code'];
    public function department(): BelongsTo { return $this->belongsTo(Department::class); }
    public function budgetUnits(): HasMany { return $this->hasMany(BudgetUnit::class); }
}
