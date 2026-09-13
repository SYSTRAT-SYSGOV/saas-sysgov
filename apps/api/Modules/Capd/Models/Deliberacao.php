<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Deliberação / Voto de membro da CAPD sobre Recurso Administrativo.
 */
final class Deliberacao extends Model
{
    use TenantAware;

    protected $table = 'capd_deliberacoes';

    protected $fillable = [
        'tenant_id',
        'sessao_id',
        'recurso_id',
        'membro_id',
        'voto_favoravel',
        'novo_grau_proposto',
        'parecer_voto',
        'voto_registrado_em',
    ];

    protected $casts = [
        'tenant_id'           => 'integer',
        'sessao_id'           => 'integer',
        'recurso_id'          => 'integer',
        'membro_id'           => 'integer',
        'voto_favoravel'      => 'boolean',
        'novo_grau_proposto'  => 'integer',
        'voto_registrado_em'  => 'datetime',
    ];

    public function sessao(): BelongsTo
    {
        return $this->belongsTo(Sessao::class, 'sessao_id');
    }

    public function recurso(): BelongsTo
    {
        return $this->belongsTo(Recurso::class, 'recurso_id');
    }

    public function membro(): BelongsTo
    {
        return $this->belongsTo(ComissaoMembro::class, 'membro_id');
    }
}
