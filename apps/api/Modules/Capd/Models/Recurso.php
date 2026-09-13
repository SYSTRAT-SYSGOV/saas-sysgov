<?php

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/** Recurso administrativo interposto pelo servidor (2ª instância). */
final class Recurso extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_recursos';

    protected $fillable = [
        'tenant_id', 'avaliacao_id', 'recorrente_id', 'fator_contestado_id',
        'justificativa_servidor', 'status', 'relator_id', 'prazo_relator_ate',
        'contestacao_chefia', 'contestacao_em',
    ];

    protected $casts = [
        'tenant_id'          => 'integer',
        'avaliacao_id'       => 'integer',
        'recorrente_id'      => 'integer',
        'fator_contestado_id'=> 'integer',
        'relator_id'         => 'integer',
        'prazo_relator_ate'  => 'datetime',
        'contestacao_em'     => 'datetime',
    ];

    public const STATUS_INTERPOSTO          = 'interposto';
    public const STATUS_EM_INSTRUCAO        = 'em_instrucao';
    public const STATUS_PAUTADO             = 'pautado';
    public const STATUS_JULGADO_PROVIDO     = 'julgado_provido';
    public const STATUS_JULGADO_DESPROVIDO  = 'julgado_desprovido';
    public const STATUS_CANCELADO           = 'cancelado';

    public const STATUS_PENDENTES = [
        self::STATUS_INTERPOSTO,
        self::STATUS_EM_INSTRUCAO,
        self::STATUS_PAUTADO,
    ];

    public function avaliacao(): BelongsTo
    {
        return $this->belongsTo(Avaliacao::class, 'avaliacao_id');
    }

    public function fatorContestado(): BelongsTo
    {
        return $this->belongsTo(FatorAvaliacao::class, 'fator_contestado_id');
    }

    public function relator(): BelongsTo
    {
        return $this->belongsTo(ComissaoMembro::class, 'relator_id');
    }

    public function documentos(): HasMany
    {
        return $this->hasMany(RecursoDocumento::class, 'recurso_id');
    }

    public function deliberacoes(): HasMany
    {
        return $this->hasMany(Deliberacao::class, 'recurso_id');
    }

    public function scopePendentes($query)
    {
        return $query->whereIn('status', self::STATUS_PENDENTES);
    }

    public function isPendente(): bool
    {
        return in_array($this->status, self::STATUS_PENDENTES);
    }
}
