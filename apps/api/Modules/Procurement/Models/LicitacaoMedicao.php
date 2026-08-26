<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

final class LicitacaoMedicao extends Model
{
    use TenantAware;

    protected $table = 'licitacao_medicoes';

    protected $fillable = [
        'tenant_id',
        'contrato_id',
        'numero',
        'periodo',
        'valor_cents',
        'status',
        'observacoes',
        'fiscal_id',
        'atestado_em',
        'anexos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'contrato_id' => 'integer',
        'valor_cents' => 'integer',
        'fiscal_id' => 'integer',
        'atestado_em' => 'datetime',
        'anexos' => 'array',
    ];

    public function contrato(): BelongsTo
    {
        return $this->belongsTo(LicitacaoContrato::class, 'contrato_id');
    }

    public function fiscal(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fiscal_id');
    }
}
