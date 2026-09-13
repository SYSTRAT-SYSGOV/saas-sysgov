<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Item de Pauta em Sessão Deliberativa da CAPD.
 */
final class SessaoPauta extends Model
{
    use TenantAware;

    protected $table = 'capd_sessao_pautas';

    protected $fillable = [
        'tenant_id',
        'sessao_id',
        'recurso_id',
        'avaliacao_id',
        'ordem',
        'status_pauta',
    ];

    protected $casts = [
        'tenant_id'    => 'integer',
        'sessao_id'    => 'integer',
        'recurso_id'   => 'integer',
        'avaliacao_id' => 'integer',
        'ordem'        => 'integer',
    ];

    public function sessao(): BelongsTo
    {
        return $this->belongsTo(Sessao::class, 'sessao_id');
    }

    public function recurso(): BelongsTo
    {
        return $this->belongsTo(Recurso::class, 'recurso_id');
    }

    public function avaliacao(): BelongsTo
    {
        return $this->belongsTo(Avaliacao::class, 'avaliacao_id');
    }
}
