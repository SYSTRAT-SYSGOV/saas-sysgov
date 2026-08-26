<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoAditivo extends Model
{
    use TenantAware;

    protected $table = 'licitacao_aditivos';

    protected $fillable = [
        'tenant_id',
        'contrato_id',
        'numero',
        'tipo',
        'valor_cents',
        'percentual_aditivo',
        'percentual_acumulado',
        'nova_vigencia_fim',
        'motivo',
        'status',
        'assinado_por',
        'assinado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contrato_id' => 'integer',
        'valor_cents' => 'integer',
        'percentual_aditivo' => 'float',
        'percentual_acumulado' => 'float',
        'nova_vigencia_fim' => 'date',
        'assinado_por' => 'integer',
        'assinado_em' => 'datetime',
    ];

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(LicitacaoContrato::class, 'contrato_id');
    }

    public function assinante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assinado_por');
    }
}
