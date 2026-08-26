<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class ContratoLicitacao extends Model
{
    use TenantAware;

    protected $table = 'contratos_licitacao';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'numero',
        'fornecedor_id',
        'valor_inicial_cents',
        'vigencia_inicio',
        'vigencia_fim',
        'garantia',
        'gestor_id',
        'fiscal_id',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'fornecedor_id' => 'integer',
        'valor_inicial_cents' => 'integer',
        'vigencia_inicio' => 'date',
        'vigencia_fim' => 'date',
        'gestor_id' => 'integer',
        'fiscal_id' => 'integer',
    ];
}
