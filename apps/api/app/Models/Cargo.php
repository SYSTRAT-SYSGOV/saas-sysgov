<?php

declare(strict_types=1);

namespace App\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Cargo (posição) dentro de uma secretaria/órgão do tenant.
 * Ex.: Assistente Administrativo, Fiscal de Obras, Pregoeiro, Gestor de Contratos.
 */
final class Cargo extends Model
{
    use TenantAware;

    protected $fillable = [
        'tenant_id', 'name', 'description', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}