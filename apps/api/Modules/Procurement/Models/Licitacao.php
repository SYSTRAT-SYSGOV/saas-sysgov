<?php

declare(strict_types=1);

namespace Modules\Procurement\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

final class Licitacao extends Model
{
    use TenantAware;

    protected $table = 'licitacoes';

    protected $fillable = [
        'tenant_id',
        'org_unit_id',
        'created_by',
        'homologador_id',
        'numero',
        'modalidade',
        'objeto',
        'criterio_julgamento',
        'regime_execucao',
        'valor_estimado_cents',
        'status',
        'fase_interna',
        'data_abertura',
        'fundamento_legal',
        'metadata',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'org_unit_id' => 'integer',
        'created_by' => 'integer',
        'homologador_id' => 'integer',
        'valor_estimado_cents' => 'integer',
        'fase_interna' => 'array',
        'data_abertura' => 'datetime',
        'metadata' => 'array',
    ];

    public function orgUnit(): BelongsTo
    {
        return $this->belongsTo(\Modules\OrgChart\Models\OrgUnit::class, 'org_unit_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'created_by');
    }

    public function homologador(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'homologador_id');
    }

    public function artefatos(): HasMany
    {
        return $this->hasMany(ProcurementArtefato::class);
    }

    public function precos(): HasMany
    {
        return $this->hasMany(LicitacaoPreco::class);
    }

    public function participantes(): HasMany
    {
        return $this->hasMany(LicitacaoParticipante::class);
    }

    public function lances(): HasMany
    {
        return $this->hasMany(LicitacaoLance::class);
    }

    public function contratos(): HasMany
    {
        return $this->hasMany(ContratoLicitacao::class);
    }

    public function pareceres(): HasMany
    {
        return $this->hasMany(LicitacaoParecer::class);
    }
}
