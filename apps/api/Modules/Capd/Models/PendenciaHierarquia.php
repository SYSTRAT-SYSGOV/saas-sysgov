<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Fila de exceção para o DRH: casos em que HierarquiaService não conseguiu
 * resolver automaticamente o avaliador de um servidor (sem superior, sem
 * substituto formal em afastamento, ou topo da hierarquia sem configuração).
 */
final class PendenciaHierarquia extends Model
{
    use TenantAware;

    protected $table = 'capd_pendencias_hierarquia';

    public const TIPO_SEM_SUPERIOR = 'sem_superior';
    public const TIPO_AFASTAMENTO_SEM_SUBSTITUTO = 'afastamento_sem_substituto';
    public const TIPO_TOPO_SEM_CONFIG = 'topo_sem_config';

    public const STATUS_ABERTA = 'aberta';
    public const STATUS_RESOLVIDA = 'resolvida';

    protected $fillable = [
        'tenant_id',
        'servidor_id',
        'ciclo_id',
        'tipo_pendencia',
        'motivo',
        'status',
        'avaliador_designado_id',
        'resolvido_por',
        'resolvido_em',
    ];

    protected $casts = [
        'tenant_id'               => 'integer',
        'servidor_id'             => 'integer',
        'ciclo_id'                => 'integer',
        'avaliador_designado_id'  => 'integer',
        'resolvido_por'           => 'integer',
        'resolvido_em'            => 'datetime',
    ];

    /** @return BelongsTo<Servidor, $this> */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }

    /** @return BelongsTo<CicloAvaliacao, $this> */
    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    /** @return BelongsTo<User, $this> */
    public function avaliadorDesignado(): BelongsTo
    {
        return $this->belongsTo(User::class, 'avaliador_designado_id');
    }

    /** @return BelongsTo<User, $this> */
    public function resolvidoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolvido_por');
    }

    public function scopeAbertas($query)
    {
        return $query->where('status', self::STATUS_ABERTA);
    }
}
