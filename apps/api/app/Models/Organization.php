<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Organization extends Model
{
    use TenantAware;
    protected $fillable = ['name', 'code'];
    public function departments(): HasMany { return $this->hasMany(Department::class); }
}
