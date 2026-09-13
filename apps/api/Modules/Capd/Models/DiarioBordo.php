<?php

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Registro de Incidente Crítico (CIT) no Diário de Bordo Digital.
 *
 * Vincula servidor + avaliador + fator + ciclo.
 * Exige ao menos 1 evidência com hash_sha256 para graus 1, 2 ou 5.
 */
final class DiarioBordo extends Model
{
    use TenantAware, SoftDeletes;

    protected $table = 'capd_diario_bordo';

    protected $fillable = [
        'tenant_id',
        'ciclo_id',
        'servidor_id',
        'avaliador_id',
        'fator_id',
        'tipo',
        'data_ocorrencia',
        'descricao_fato',
        'ciencia_servidor_em',
    ];

    protected $casts = [
        'tenant_id'           => 'integer',
        'ciclo_id'            => 'integer',
        'servidor_id'         => 'integer',
        'avaliador_id'        => 'integer',
        'fator_id'            => 'integer',
        'data_ocorrencia'     => 'date',
        'ciencia_servidor_em' => 'datetime',
    ];

    public const TIPO_POSITIVO = 'positivo';
    public const TIPO_NEGATIVO = 'negativo';

    // ── Relacionamentos ───────────────────────────────────────────────

    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    public function fator(): BelongsTo
    {
        return $this->belongsTo(FatorAvaliacao::class, 'fator_id');
    }

    public function evidencias(): HasMany
    {
        return $this->hasMany(Evidencia::class, 'diario_bordo_id');
    }

    // ── Scopes ───────────────────────────────────────────────────────

    /**
     * Incidentes com pelo menos 1 evidência com hash válido.
     * Usado pelas travas eletrônicas antileniência.
     */
    public function scopeComEvidencia($query)
    {
        return $query->whereHas('evidencias', fn ($q) =>
            $q->whereNotNull('hash_sha256')
        );
    }

    public function scopeParaServidor($query, int $servidorId)
    {
        return $query->where('servidor_id', $servidorId);
    }

    public function scopeParaFator($query, int $fatorId)
    {
        return $query->where('fator_id', $fatorId);
    }

    public function scopeNoCiclo($query, int $cicloId)
    {
        return $query->where('ciclo_id', $cicloId);
    }

    // ── Helpers ───────────────────────────────────────────────────────

    public function isPositivo(): bool
    {
        return $this->tipo === self::TIPO_POSITIVO;
    }

    public function possuiEvidenciaValida(): bool
    {
        return $this->evidencias()
            ->whereNotNull('hash_sha256')
            ->exists();
    }
}
