<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Department extends Model
{
    use TenantAware;
    protected $fillable = ['organization_id', 'name', 'code'];
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function managementUnits(): HasMany { return $this->hasMany(ManagementUnit::class); }
}
