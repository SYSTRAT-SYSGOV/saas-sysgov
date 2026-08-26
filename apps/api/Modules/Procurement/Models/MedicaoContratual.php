<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class MedicaoContratual extends Model
{
    use TenantAware;

    protected $table = 'medicoes_contratuais';

    protected $fillable = [
        'tenant_id',
        'contrato_id',
        'numero',
        'periodo',
        'valor_cents',
        'status',
        'anexos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contrato_id' => 'integer',
        'valor_cents' => 'integer',
        'anexos' => 'array',
    ];
}
