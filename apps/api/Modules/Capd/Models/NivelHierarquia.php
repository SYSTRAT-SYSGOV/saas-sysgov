<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Nível hierárquico parametrizável por tenant, usado por HierarquiaService
 * para resolver quantos passos subir na árvore de OrgUnit até achar o
 * avaliador, e para configurar quem avalia o topo da hierarquia.
 */
final class NivelHierarquia extends Model
{
    use TenantAware;

    protected $table = 'capd_niveis_hierarquia';

    public const REGRA_SUBSTITUTO_LEGAL = 'substituto_legal';
    public const REGRA_SUPERIOR_HIERARQUICO = 'superior_hierarquico';

    protected $fillable = [
        'tenant_id',
        'nivel',
        'nome',
        'cargo_referencia',
        'regra_substituicao',
        'is_topo',
        'avaliador_topo_user_id',
        'avaliador_topo_role',
        'ativo',
    ];

    protected $casts = [
        'tenant_id'               => 'integer',
        'nivel'                   => 'integer',
        'is_topo'                 => 'boolean',
        'avaliador_topo_user_id'  => 'integer',
        'ativo'                   => 'boolean',
    ];

    /** @return BelongsTo<User, $this> */
    public function avaliadorTopo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'avaliador_topo_user_id');
    }

    public function scopeAtivos($query)
    {
        return $query->where('ativo', true);
    }

    public function scopeOrdenados($query)
    {
        return $query->orderBy('nivel');
    }
}
