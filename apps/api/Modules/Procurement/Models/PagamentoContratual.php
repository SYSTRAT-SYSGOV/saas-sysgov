<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

final class PagamentoContratual extends Model
{
    use TenantAware;

    protected $table = 'pagamentos_contratuais';

    protected $fillable = [
        'tenant_id',
        'contrato_id',
        'nota_fiscal',
        'valor_cents',
        'data_vencimento',
        'data_pagamento',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contrato_id' => 'integer',
        'valor_cents' => 'integer',
        'data_vencimento' => 'date',
        'data_pagamento' => 'date',
    ];
}
