<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Sessão Deliberativa da Comissão CAPD.
 */
final class Sessao extends Model
{
    use TenantAware;

    protected $table = 'capd_sessoes';

    protected $fillable = [
        'tenant_id',
        'comissao_id',
        'tipo_sessao',
        'data_sessao',
        'quorum_presente',
        'quorum_minimo',
        'ata_texto',
        'hash_ata_sha256',
        'finalizada',
        'finalizada_em',
    ];

    protected $casts = [
        'tenant_id'       => 'integer',
        'comissao_id'     => 'integer',
        'data_sessao'     => 'datetime',
        'quorum_presente' => 'integer',
        'quorum_minimo'   => 'integer',
        'finalizada'      => 'boolean',
        'finalizada_em'   => 'datetime',
    ];

    public function comissao(): BelongsTo
    {
        return $this->belongsTo(Comissao::class, 'comissao_id');
    }

    public function pautas(): HasMany
    {
        return $this->hasMany(SessaoPauta::class, 'sessao_id')->orderBy('ordem');
    }

    public function deliberacoes(): HasMany
    {
        return $this->hasMany(Deliberacao::class, 'sessao_id');
    }

    public function temQuorum(): bool
    {
        return $this->quorum_presente >= $this->quorum_minimo;
    }
}
