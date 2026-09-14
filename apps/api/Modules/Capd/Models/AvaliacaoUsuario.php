<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Avaliação pelo Usuário Externo (art. 25) — RF-06.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $servidor_id
 * @property int $ciclo_id
 * @property string $nota_atendimento — DECIMAL(5,2) como string, nunca float
 * @property string|null $comentario
 * @property string|null $avaliador_identificador
 */
final class AvaliacaoUsuario extends Model
{
    use TenantAware;

    protected $table = 'capd_avaliacoes_usuario';

    protected $fillable = [
        'tenant_id',
        'servidor_id',
        'ciclo_id',
        'nota_atendimento',
        'comentario',
        'avaliador_identificador',
    ];

    protected $casts = [
        'tenant_id'         => 'integer',
        'servidor_id'       => 'integer',
        'ciclo_id'          => 'integer',
        'nota_atendimento'  => 'string',
    ];

    public function servidor(): BelongsTo
    {
        return $this->belongsTo(Servidor::class, 'servidor_id');
    }

    public function ciclo(): BelongsTo
    {
        return $this->belongsTo(CicloAvaliacao::class, 'ciclo_id');
    }
}
