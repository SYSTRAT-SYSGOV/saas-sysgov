<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class AditivoContratual extends Model
{
    use TenantAware;

    protected $table = 'aditivos_contratuais';

    protected $fillable = [
        'tenant_id',
        'contrato_id',
        'numero',
        'tipo',
        'valor_cents',
        'percentual_acumulado',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contrato_id' => 'integer',
        'valor_cents' => 'integer',
        'percentual_acumulado' => 'decimal:2',
    ];
}
