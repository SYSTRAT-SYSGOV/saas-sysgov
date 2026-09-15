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
 * @property int $id
 * @property int $tenant_id
 * @property int $ciclo_id
 * @property int $servidor_id
 * @property int $avaliador_id
 * @property \Illuminate\Support\Carbon|null $periodo_inicio
 * @property \Illuminate\Support\Carbon|null $periodo_fim
 * @property int|null $dias_exercicio
 * @property int|null $avaliacao_consolidada_id
 * @property string $tipo_avaliacao
 * @property string $status_avaliacao
 * @property array<string, mixed>|null $respostas_fatores
 * @property int|null $modelo_formulario_id
 * @property array<string, mixed>|null $respostas_perguntas
 * @property string|null $nota_final
 * @property bool|null $elegivel_progressao
 * @property \Illuminate\Support\Carbon|null $data_conclusao
 * @property \Illuminate\Support\Carbon|null $ciencia_servidor_em
 * @property bool $devolutiva_realizada
 * @property \Illuminate\Support\Carbon|null $devolutiva_em
 * @property string|null $devolutiva_resumo
 * @property string|null $devolutiva_acordos
 * @property int|null $devolutiva_por
 * @property string|null $ciencia_ip
 * @property string|null $ciencia_tipo
 * @property string|null $parecer_avaliador
 * @property bool $homologada
 * @property \Illuminate\Support\Carbon|null $homologada_em
 * @property int|null $homologada_por
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
        'modelo_formulario_id',
        'respostas_perguntas',
        'nota_final',
        'elegivel_progressao',
        'data_conclusao',
        'ciencia_servidor_em',
        'devolutiva_realizada',
        'devolutiva_em',
        'devolutiva_resumo',
        'devolutiva_acordos',
        'devolutiva_por',
        'ciencia_ip',
        'ciencia_tipo',
        'parecer_avaliador',
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
        'modelo_formulario_id'     => 'integer',
        'respostas_perguntas'      => 'array',
        // DECIMAL(5,2) — NUNCA float
        'nota_final'           => 'string',
        'elegivel_progressao'  => 'boolean',
        'data_conclusao'       => 'datetime',
        'ciencia_servidor_em'  => 'datetime',
        'devolutiva_realizada' => 'boolean',
        'devolutiva_em'        => 'datetime',
        'devolutiva_por'       => 'integer',
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

    /** @return BelongsTo<CicloAvaliacao, $this> */
    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    /** @return BelongsTo<ModeloFormulario, $this> */
    public function modeloFormulario(): BelongsTo
    {
        return $this->belongsTo(ModeloFormulario::class, 'modelo_formulario_id');
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'servidor_id');
    }

    /** @return BelongsTo<Servidor, $this> */
    public function servidorData(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id', 'user_id');
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function avaliador(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'avaliador_id');
    }

    /** @return HasMany<Recurso, $this> */
    public function recursos(): HasMany
    {
        return $this->hasMany(Recurso::class, 'avaliacao_id');
    }

    /**
     * Avaliação "guarda-chuva" quando esta é uma parcial de transferência.
     *
     * @return BelongsTo<self, $this>
     */
    public function consolidada(): BelongsTo
    {
        return $this->belongsTo(self::class, 'avaliacao_consolidada_id');
    }

    /**
     * Avaliações parciais desta consolidada.
     *
     * @return HasMany<self, $this>
     */
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
