<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Comissão de Avaliação Periódica de Desempenho (CAPD).
 */
final class Comissao extends Model
{
    use TenantAware;

    protected $table = 'capd_comissoes';

    protected $fillable = [
        'tenant_id',
        'ciclo_id',
        'numero_portaria',
        'data_publicacao_portaria',
        'ativa',
    ];

    protected $casts = [
        'tenant_id'                => 'integer',
        'ciclo_id'                 => 'integer',
        'data_publicacao_portaria' => 'date',
        'ativa'                    => 'boolean',
    ];

    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }

    public function membros(): HasMany
    {
        return $this->hasMany(ComissaoMembro::class, 'comissao_id');
    }

    public function sessoes(): HasMany
    {
        return $this->hasMany(Sessao::class, 'comissao_id');
    }
}
