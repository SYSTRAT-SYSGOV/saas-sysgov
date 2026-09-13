<?php

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Ciclo de Avaliação Periódica de Desempenho.
 *
 * Status: planejamento → em_avaliacao → recursivo → deliberacao → homologado → encerrado
 */
final class CicloAvaliacao extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_ciclos';

    protected $fillable = [
        'tenant_id',
        'ano_referencia',
        'nome',
        'data_inicio_avaliacao',
        'data_fim_avaliacao',
        'data_limite_recurso',
        'status',
        'modo_f1',
        'modo_f2',
        'tipo_assinatura_ata',
        'metadata',
    ];

    protected $casts = [
        'tenant_id'           => 'integer',
        'ano_referencia'      => 'integer',
        'data_inicio_avaliacao' => 'date',
        'data_fim_avaliacao'  => 'date',
        'data_limite_recurso' => 'date',
        'metadata'            => 'array',
    ];

    // ── Status permitidos ─────────────────────────────────────────────
    public const STATUS_PLANEJAMENTO = 'planejamento';
    public const STATUS_EM_AVALIACAO = 'em_avaliacao';
    public const STATUS_RECURSIVO    = 'recursivo';
    public const STATUS_DELIBERACAO  = 'deliberacao';
    public const STATUS_HOMOLOGADO   = 'homologado';
    public const STATUS_ENCERRADO    = 'encerrado';

    public const MODOS_F = ['manual', 'api'];
    public const TIPOS_ASSINATURA = ['sha256', 'icp_brasil'];

    // ── Relacionamentos ───────────────────────────────────────────────

    public function avaliacoes(): HasMany
    {
        return $this->hasMany(Avaliacao::class, 'ciclo_id');
    }

    public function diarioBordo(): HasMany
    {
        return $this->hasMany(DiarioBordo::class, 'ciclo_id');
    }

    public function comissao(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(Comissao::class, 'ciclo_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    public function scopeAtivo($query)
    {
        return $query->whereNotIn('status', [self::STATUS_ENCERRADO]);
    }

    public function scopeEmAvaliacao($query)
    {
        return $query->where('status', self::STATUS_EM_AVALIACAO);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    public function usaModoManualF1(): bool
    {
        return $this->modo_f1 === 'manual';
    }

    public function usaModoManualF2(): bool
    {
        return $this->modo_f2 === 'manual';
    }

    public function usaAssinaturaIcp(): bool
    {
        return $this->tipo_assinatura_ata === 'icp_brasil';
    }
}
