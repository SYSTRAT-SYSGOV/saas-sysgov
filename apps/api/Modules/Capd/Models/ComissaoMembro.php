<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Membro da Comissão CAPD.
 */
final class ComissaoMembro extends Model
{
    use TenantAware;

    protected $table = 'capd_comissao_membros';

    protected $fillable = [
        'tenant_id',
        'comissao_id',
        'servidor_id',
        'papel',
        'ativo',
        'data_inicio_mandato',
        'data_fim_mandato',
    ];

    protected $casts = [
        'tenant_id'           => 'integer',
        'comissao_id'         => 'integer',
        'servidor_id'         => 'integer',
        'ativo'               => 'boolean',
        'data_inicio_mandato' => 'date',
        'data_fim_mandato'    => 'date',
    ];

    public const PAPEL_PRESIDENTE       = 'presidente';
    public const PAPEL_SECRETARIO       = 'secretario';
    public const PAPEL_TITULAR_GESTAO   = 'titular_gestao';
    public const PAPEL_TITULAR_SERVIDOR = 'titular_servidor';
    public const PAPEL_SUPLENTE         = 'suplente';

    public function comissao(): BelongsTo
    {
        return $this->belongsTo(Comissao::class, 'comissao_id');
    }

    public function servidor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'servidor_id');
    }

    public function impedimentos(): HasMany
    {
        return $this->hasMany(Impedimento::class, 'comissao_membro_id');
    }

    public function deliberacoes(): HasMany
    {
        return $this->hasMany(Deliberacao::class, 'membro_id');
    }

    public function recursosRelatados(): HasMany
    {
        return $this->hasMany(Recurso::class, 'relator_id');
    }
}
