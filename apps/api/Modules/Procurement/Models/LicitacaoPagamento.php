<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoPagamento extends Model
{
    use TenantAware;

    protected $table = 'licitacao_pagamentos';

    protected $fillable = [
        'tenant_id',
        'contrato_id',
        'nota_fiscal',
        'valor_cents',
        'data_vencimento',
        'data_pagamento',
        'status',
        'ordem_bancaria',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contrato_id' => 'integer',
        'valor_cents' => 'integer',
        'data_vencimento' => 'date',
        'data_pagamento' => 'date',
    ];

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(LicitacaoContrato::class, 'contrato_id');
    }
}
