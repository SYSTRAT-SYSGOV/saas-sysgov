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
 * Reunião política com ata e pendências (D6). Pendência vencida = há pendências, não resolvidas, com prazo < hoje.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $campanha_id
 * @property string $titulo
 * @property int $codigo_ibge
 * @property Carbon $inicio
 * @property string|null $pendencias
 * @property int|null $responsavel_id
 * @property Carbon|null $prazo_pendencias
 * @property bool $pendencias_resolvidas
 */
final class Reuniao extends Model
{
    use CampanhaAware;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'campanha_reunioes';

    protected $fillable = ['tenant_id', 'campanha_id', 'titulo', 'codigo_ibge', 'local', 'inicio', 'participantes', 'ata', 'pendencias', 'responsavel_id', 'prazo_pendencias', 'pendencias_resolvidas'];

    protected $appends = ['pendencia_vencida'];

    protected $casts = [
        'tenant_id' => 'integer', 'campanha_id' => 'integer', 'codigo_ibge' => 'integer', 'inicio' => 'datetime',
        'responsavel_id' => 'integer', 'prazo_pendencias' => 'date:Y-m-d', 'pendencias_resolvidas' => 'boolean',
    ];

    /** @return BelongsTo<User, $this> */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_id');
    }

    public function getPendenciaVencidaAttribute(): bool
    {
        return !$this->pendencias_resolvidas && trim((string) $this->pendencias) !== '' && $this->prazo_pendencias !== null && $this->prazo_pendencias->lt(today());
    }
}
