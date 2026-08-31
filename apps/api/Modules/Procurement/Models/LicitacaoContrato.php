<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class LicitacaoContrato extends Model
{
    use TenantAware;

    protected $table = 'contratos_licitacao';

    protected $fillable = [
        'tenant_id',
        'licitacao_id',
        'numero',
        'objeto',
        'fornecedor_nome',
        'fornecedor_cnpj',
        'valor_inicial_cents',
        'valor_atualizado_cents',
        'vigencia_inicio',
        'vigencia_fim',
        'garantia_tipo',
        'garantia_valor_cents',
        'gestor_id',
        'fiscal_id',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'licitacao_id' => 'integer',
        'valor_inicial_cents' => 'integer',
        'valor_atualizado_cents' => 'integer',
        'garantia_valor_cents' => 'integer',
        'vigencia_inicio' => 'date',
        'vigencia_fim' => 'date',
        'gestor_id' => 'integer',
        'fiscal_id' => 'integer',
    ];

    public function licitacao(): BelongsTo
    {
        return $this->belongsTo(Licitacao::class, 'licitacao_id');
    }

    public function gestor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'gestor_id');
    }

    public function fiscal(): BelongsTo
    {
        return $this->belongsTo(User::class, 'fiscal_id');
    }

    public function aditivos(): HasMany
    {
        return $this->hasMany(LicitacaoAditivo::class, 'contrato_id');
    }

    public function medicoes(): HasMany
    {
        return $this->hasMany(LicitacaoMedicao::class, 'contrato_id');
    }

    public function pagamentos(): HasMany
    {
        return $this->hasMany(LicitacaoPagamento::class, 'contrato_id');
    }
}
