<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Plano de Melhoria de Desempenho (PMD) — RF-09.
 *
 * Criado automaticamente quando o servidor atinge conceito Regular ou
 * Insuficiente (faixas configuráveis) no ciclo. Vinculado ao próximo ciclo
 * avaliativo como fator de verificação de evolução funcional.
 *
 * Ciclo de vida do status:
 *   aberto → em_andamento → concluido (ações executadas pelo responsável)
 *   → verificado (reavaliação registrada no ciclo de verificação).
 * "cancelado" é um estado terminal à parte, usado quando um novo PMD
 * supersede um anterior ainda não verificado do mesmo servidor+ciclo.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $avaliacao_id
 * @property int $servidor_id
 * @property int|null $responsavel_id
 * @property int $ciclo_id
 * @property int|null $ciclo_verificacao_id
 * @property string $nfc_gatilho      — DECIMAL(5,2), nunca float
 * @property string|null $conceito_atingido
 * @property string $objetivos
 * @property array|null $acoes
 * @property \Illuminate\Support\Carbon $prazo
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $concluido_em
 * @property \Illuminate\Support\Carbon|null $verificado_em
 * @property int|null $verificado_por
 * @property string|null $observacoes_verificacao
 */
final class PlanoMelhoria extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_planos_melhoria';

    public const STATUS_ABERTO       = 'aberto';
    public const STATUS_EM_ANDAMENTO = 'em_andamento';
    public const STATUS_CONCLUIDO    = 'concluido';
    public const STATUS_VERIFICADO   = 'verificado';
    public const STATUS_CANCELADO    = 'cancelado';

    public const STATUS_VALIDOS = [
        self::STATUS_ABERTO,
        self::STATUS_EM_ANDAMENTO,
        self::STATUS_CONCLUIDO,
        self::STATUS_VERIFICADO,
        self::STATUS_CANCELADO,
    ];

    protected $fillable = [
        'tenant_id',
        'avaliacao_id',
        'servidor_id',
        'responsavel_id',
        'ciclo_id',
        'ciclo_verificacao_id',
        'nfc_gatilho',
        'conceito_atingido',
        'objetivos',
        'acoes',
        'prazo',
        'status',
        'concluido_em',
        'verificado_em',
        'verificado_por',
        'observacoes_verificacao',
    ];

    protected $casts = [
        'tenant_id'            => 'integer',
        'avaliacao_id'         => 'integer',
        'servidor_id'          => 'integer',
        'responsavel_id'       => 'integer',
        'ciclo_id'             => 'integer',
        'ciclo_verificacao_id' => 'integer',
        // DECIMAL armazenado como string para evitar perda de precisão (RN)
        'nfc_gatilho'          => 'string',
        'acoes'                => 'array',
        'prazo'                => 'date',
        'concluido_em'         => 'datetime',
        'verificado_em'        => 'datetime',
        'verificado_por'       => 'integer',
    ];

    // ── Relacionamentos ───────────────────────────────────────────────

    public function avaliacao(): BelongsTo
    {
        return $this->belongsTo(Avaliacao::class, 'avaliacao_id');
    }

    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    public function cicloVerificacao(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_verificacao_id');
    }

    /**
     * @return BelongsTo<Servidor, $this>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    /** PMDs ainda não verificados (aberto, em andamento ou com ações concluídas). */
    public function scopePendentes(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_ABERTO, self::STATUS_EM_ANDAMENTO, self::STATUS_CONCLUIDO]);
    }

    public function scopeDoCiclo(Builder $query, int $cicloId): Builder
    {
        return $query->where('ciclo_id', $cicloId);
    }

    public function scopeDoServidor(Builder $query, int $servidorId): Builder
    {
        return $query->where('servidor_id', $servidorId);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    /** Ainda pode ser editado (não foi verificado nem cancelado). */
    public function estaAtivo(): bool
    {
        return in_array($this->status, [self::STATUS_ABERTO, self::STATUS_EM_ANDAMENTO, self::STATUS_CONCLUIDO], true);
    }
}
