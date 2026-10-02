<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Proposição legislativa ou demanda institucional.
 *
 * @property int    $id
 * @property int    $tenant_id
 * @property int    $tipo_instrumento_id
 * @property string $numero
 * @property int    $numero_sequencial
 * @property int    $exercicio
 * @property string $ementa
 * @property string|null $justificativa
 * @property string|null $conteudo
 * @property string|null $area_tematica
 * @property string|null $dispositivos_legais
 * @property string $poder_origem
 * @property int    $autor_principal_id
 * @property string|null $partido_bancada
 * @property string $status
 * @property bool   $visibilidade_publica
 * @property int|null $vinculacao_proposicao_id
 * @property int|null $vinculacao_processo_id
 * @property array<string, mixed>|null $dados_pessoais
 * @property array<string, mixed>|null $metadata
 */
final class Proposicao extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'requerimentos_proposicoes';

    public const STATUS_PROTOCOLADO            = 'protocolado';
    public const STATUS_EM_TRAMITACAO_INTERNA  = 'em_tramitacao_interna';
    public const STATUS_ENCAMINHADO            = 'encaminhado';
    public const STATUS_RECEBIDO               = 'recebido';
    public const STATUS_RESPONDIDO             = 'respondido';
    public const STATUS_APROVADO               = 'aprovado';
    public const STATUS_REJEITADO              = 'rejeitado';
    public const STATUS_ARQUIVADO              = 'arquivado';
    public const STATUS_VENCIDO                = 'vencido';

    public const PODER_CAMARA    = 'camara';
    public const PODER_PREFEITURA = 'prefeitura';

    protected $fillable = [
        'tenant_id',
        'tipo_instrumento_id',
        'numero',
        'numero_sequencial',
        'exercicio',
        'ementa',
        'justificativa',
        'conteudo',
        'area_tematica',
        'dispositivos_legais',
        'poder_origem',
        'autor_principal_id',
        'partido_bancada',
        'status',
        'visibilidade_publica',
        'vinculacao_proposicao_id',
        'vinculacao_processo_id',
        'dados_pessoais',
        'metadata',
    ];

    protected $casts = [
        'tenant_id'                  => 'integer',
        'tipo_instrumento_id'        => 'integer',
        'numero_sequencial'          => 'integer',
        'exercicio'                  => 'integer',
        'autor_principal_id'         => 'integer',
        'visibilidade_publica'       => 'boolean',
        'vinculacao_proposicao_id'   => 'integer',
        'vinculacao_processo_id'     => 'integer',
        'dados_pessoais'             => 'encrypted',
        'metadata'                   => 'array',
    ];

    // ── Relacionamentos ───────────────────────────────────────────────

    /** @return BelongsTo<TipoInstrumento, $this> */
    public function tipoInstrumento(): BelongsTo
    {
        return $this->belongsTo(TipoInstrumento::class, 'tipo_instrumento_id');
    }

    /** @return BelongsTo<\App\Models\User, $this> */
    public function autorPrincipal(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'autor_principal_id');
    }

    /** @return HasMany<Autor, $this> */
    public function autores(): HasMany
    {
        return $this->hasMany(Autor::class, 'proposicao_id');
    }

    /** @return MorphMany<Anexo, $this> */
    public function anexos(): MorphMany
    {
        return $this->morphMany(Anexo::class, 'anexavel');
    }

    /** @return HasMany<TramitacaoPoderes, $this> */
    public function tramitacoesPoderes(): HasMany
    {
        return $this->hasMany(TramitacaoPoderes::class, 'proposicao_id');
    }

    /** @return HasMany<EtapaTramitacao, $this> */
    public function etapasTramitacao(): HasMany
    {
        return $this->hasMany(EtapaTramitacao::class, 'proposicao_id');
    }

    /** @return BelongsTo<self, $this> */
    public function proposicaoVinculada(): BelongsTo
    {
        return $this->belongsTo(self::class, 'vinculacao_proposicao_id');
    }

    /** @return HasMany<Vinculacao, $this> */
    public function vinculacoesOrigem(): HasMany
    {
        return $this->hasMany(Vinculacao::class, 'proposicao_origem_id');
    }

    /** @return HasMany<Vinculacao, $this> */
    public function vinculacoesDestino(): HasMany
    {
        return $this->hasMany(Vinculacao::class, 'proposicao_destino_id');
    }

    // ── Scopes ────────────────────────────────────────────────────────

    /**
     * @param Builder<Proposicao> $query
     * @return Builder<Proposicao>
     */
    public function scopePublica(Builder $query): Builder
    {
        return $query->where('visibilidade_publica', true);
    }

    /**
     * @param Builder<Proposicao> $query
     * @return Builder<Proposicao>
     */
    public function scopeDoPoder(Builder $query, string $poder): Builder
    {
        return $query->where('poder_origem', $poder);
    }

    /**
     * @param Builder<Proposicao> $query
     * @return Builder<Proposicao>
     */
    public function scopeDoAutor(Builder $query, int $userId): Builder
    {
        return $query->where('autor_principal_id', $userId);
    }

    /**
     * @param Builder<Proposicao> $query
     * @return Builder<Proposicao>
     */
    public function scopeDoExercicio(Builder $query, int $exercicio): Builder
    {
        return $query->where('exercicio', $exercicio);
    }

    /**
     * @param Builder<Proposicao> $query
     * @return Builder<Proposicao>
     */
    public function scopeEmTramitacao(Builder $query): Builder
    {
        return $query->whereIn('status', [
            self::STATUS_PROTOCOLADO,
            self::STATUS_EM_TRAMITACAO_INTERNA,
            self::STATUS_ENCAMINHADO,
            self::STATUS_RECEBIDO,
        ]);
    }
}