<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Percurso (linha simplificada) importado de um arquivo KML. Fica numa tabela própria para a lista de rotas não carregar
 * milhares de coordenadas. O arquivo original não é guardado.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $rota_id
 * @property list<array{0: float, 1: float}> $coordenadas pares [latitude, longitude]
 * @property int $pontos
 * @property string $km
 * @property int|null $importado_por
 * @property \Illuminate\Support\Carbon $importado_em
 */
final class RotaPercurso extends Model
{
    use TenantAware;

    protected $table = 'transporte_rota_percursos';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'rota_id', 'coordenadas', 'pontos', 'km', 'importado_por', 'importado_em'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'rota_id' => 'integer', 'coordenadas' => 'array', 'pontos' => 'integer', 'km' => 'decimal:2', 'importado_por' => 'integer', 'importado_em' => 'datetime'];

    /** @return BelongsTo<Rota, $this> */
    public function rota(): BelongsTo
    {
        return $this->belongsTo(Rota::class, 'rota_id');
    }
}
