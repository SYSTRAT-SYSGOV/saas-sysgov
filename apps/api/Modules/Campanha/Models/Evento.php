<?php

declare(strict_types=1);

namespace Modules\Campanha\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use Modules\Campanha\Models\Concerns\CampanhaAware;

/**
 * Comício ou evento da campanha (D6).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $nome
 * @property int $codigo_ibge
 * @property string $local
 * @property Carbon $inicio
 * @property int|null $responsavel_id
 */
final class Evento extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'campanha_eventos';

    protected $fillable = ['tenant_id', 'campanha_id', 'nome', 'codigo_ibge', 'local', 'inicio', 'responsavel_id', 'publico_estimado', 'publico_presente', 'observacoes'];

    protected $casts = [
        'tenant_id' => 'integer', 'campanha_id' => 'integer', 'codigo_ibge' => 'integer', 'inicio' => 'datetime',
        'responsavel_id' => 'integer', 'publico_estimado' => 'integer', 'publico_presente' => 'integer',
    ];

    /** @return BelongsTo<User, $this> */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_id');
    }
}
