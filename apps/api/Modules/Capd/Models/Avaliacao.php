<?php

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Capd\Events\AvaliacaoHomologada;

/**
 * Avaliação de Desempenho de um servidor num ciclo.
 *
 * INVARIANTE: após homologada = true, o registro é imutável (RN-C07).
 * Qualquer tentativa de update dispara AvaliacaoHomologadaException.
 */
final class Avaliacao extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_avaliacoes';

    public const TIPO_INTEGRAL = 'integral';
    public const TIPO_PARCIAL = 'parcial';
    public const TIPO_CONSOLIDADA = 'consolidada';

    public const STATUS_ATIVA = 'ativa';
    public const STATUS_SUSPENSA = 'suspensa_licenca';

    protected $fillable = [
        'tenant_id',
        'ciclo_id',
        'servidor_id',
        'avaliador_id',
        'periodo_inicio',
        'periodo_fim',
        'dias_exercicio',
        'avaliacao_consolidada_id',
        'tipo_avaliacao',
        'status_avaliacao',
        'respostas_fatores',
        'nota_final',
        'elegivel_progressao',
        'data_conclusao',
        'ciencia_servidor_em',
        'homologada',
        'homologada_em',
        'homologada_por',
    ];

    protected $casts = [
        'tenant_id'                => 'integer',
        'ciclo_id'                 => 'integer',
        'servidor_id'              => 'integer',
        'avaliador_id'             => 'integer',
        'periodo_inicio'           => 'date',
        'periodo_fim'              => 'date',
        'dias_exercicio'           => 'integer',
        'avaliacao_consolidada_id' => 'integer',
        'tipo_avaliacao'           => 'string',
        'status_avaliacao'         => 'string',
        'respostas_fatores'        => 'array',
        // DECIMAL(5,2) — NUNCA float
        'nota_final'           => 'string',
        'elegivel_progressao'  => 'boolean',
        'data_conclusao'       => 'datetime',
        'ciencia_servidor_em'  => 'datetime',
        'homologada'           => 'boolean',
        'homologada_em'        => 'datetime',
        'homologada_por'       => 'integer',
    ];

    // ── Guard de imutabilidade (RN-C07) ───────────────────────────────

    protected static function booted(): void
    {
        static::updating(function (self $avaliacao): void {
            if ($avaliacao->getOriginal('homologada') === true) {
                throw new \DomainException(
                    "Avaliação #{$avaliacao->id} já homologada é imutável (RN-C07). " .
                    "Nenhuma alteração posterior é permitida."
                );
            }
        });

        static::updated(function (self $avaliacao): void {
            if ($avaliacao->homologada && ! $avaliacao->getOriginal('homologada')) {
                event(new AvaliacaoHomologada($avaliacao));
            }
        });
    }

    // ── Relacionamentos ───────────────────────────────────────────────

    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    public function servidor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'servidor_id');
    }

    public function avaliador(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'avaliador_id');
    }

    public function recursos(): HasMany
    {
        return $this->hasMany(Recurso::class, 'avaliacao_id');
    }

    /** Avaliação "guarda-chuva" quando esta é uma parcial de transferência. */
    public function consolidada(): BelongsTo
    {
        return $this->belongsTo(self::class, 'avaliacao_consolidada_id');
    }

    /** Avaliações parciais desta consolidada. */
    public function parciais(): HasMany
    {
        return $this->hasMany(self::class, 'avaliacao_consolidada_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    /** RF-C04: notas extremas para auditoria mandatória */
    public function scopeNotasExtremas($query)
    {
        return $query->where(fn ($q) =>
            $q->where('nota_final', '>', '9.50')
              ->orWhere('nota_final', '<', '5.00')
        );
    }

    /** RN-C10: amostragem aleatória de notas medianas (5.00 – 9.50) */
    public function scopeNotasMedianas($query)
    {
        return $query->whereBetween('nota_final', ['5.00', '9.50']);
    }

    public function scopeNaoHomologadas($query)
    {
        return $query->where('homologada', false);
    }

    public function scopeParciaisPendentes($query)
    {
        return $query->where('tipo_avaliacao', self::TIPO_PARCIAL)->where('homologada', false);
    }

    public function scopeSemRecursoPendente($query)
    {
        return $query->whereDoesntHave('recursos', fn ($q) =>
            $q->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])
        );
    }

    // ── Helpers ───────────────────────────────────────────────────────

    public function possuiRecursoPendente(): bool
    {
        return $this->recursos()
            ->whereIn('status', ['interposto', 'em_instrucao', 'pautado'])
            ->exists();
    }
}
