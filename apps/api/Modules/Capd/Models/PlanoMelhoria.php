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
 * Criado automaticamente quando o servidor atinge NFC inferior à
 * nota_corte_nfc do ciclo. Vinculado ao próximo ciclo avaliativo
 * como fator de verificação de evolução funcional.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $avaliacao_id
 * @property int $servidor_id
 * @property int $ciclo_id
 * @property int|null $ciclo_verificacao_id
 * @property string $nfc_gatilho      — DECIMAL(5,2), nunca float
 * @property string $objetivos
 * @property array|null $acoes
 * @property \Illuminate\Support\Carbon $prazo
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $concluido_em
 * @property string|null $observacoes_verificacao
 */
final class PlanoMelhoria extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_planos_melhoria';

    public const STATUS_PENDENTE     = 'pendente';
    public const STATUS_EM_ANDAMENTO = 'em_andamento';
    public const STATUS_CONCLUIDO    = 'concluido';
    public const STATUS_CANCELADO    = 'cancelado';

    public const STATUS_VALIDOS = [
        self::STATUS_PENDENTE,
        self::STATUS_EM_ANDAMENTO,
        self::STATUS_CONCLUIDO,
        self::STATUS_CANCELADO,
    ];

    protected $fillable = [
        'tenant_id',
        'avaliacao_id',
        'servidor_id',
        'ciclo_id',
        'ciclo_verificacao_id',
        'nfc_gatilho',
        'objetivos',
        'acoes',
        'prazo',
        'status',
        'concluido_em',
        'observacoes_verificacao',
    ];

    protected $casts = [
        'tenant_id'            => 'integer',
        'avaliacao_id'         => 'integer',
        'servidor_id'          => 'integer',
        'ciclo_id'             => 'integer',
        'ciclo_verificacao_id' => 'integer',
        // DECIMAL armazenado como string para evitar perda de precisão (RN)
        'nfc_gatilho'          => 'string',
        'acoes'                => 'array',
        'prazo'                => 'date',
        'concluido_em'         => 'datetime',
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

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopePendentes(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_PENDENTE, self::STATUS_EM_ANDAMENTO]);
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

    public function estaAtivo(): bool
    {
        return in_array($this->status, [self::STATUS_PENDENTE, self::STATUS_EM_ANDAMENTO], true);
    }
}
