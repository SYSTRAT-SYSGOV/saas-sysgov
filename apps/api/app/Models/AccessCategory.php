<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Categoria de grupos de acesso — facilita organizar grupos (ex.: Técnicos, Gestão, Fiscalização).
 */
final class AccessCategory extends Model
{
    use TenantAware;

    protected $fillable = [
        'tenant_id', 'name', 'description',
    ];

    public function groups(): HasMany
    {
        return $this->hasMany(AccessGroup::class, 'category_id');
    }
}