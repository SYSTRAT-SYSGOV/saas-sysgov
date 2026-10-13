<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Ponto de entrega voluntária de logística reversa (eletrônicos, pilhas e baterias)
 * — ver spec `meio-ambiente/residuos-solidos`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string $categoria
 * @property string|null $endereco
 * @property float|null $latitude
 * @property float|null $longitude
 */
final class PontoLogisticaReversa extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_pontos_logistica_reversa';

    public const CATEGORIA_ELETRONICOS = 'eletronicos';
    public const CATEGORIA_PILHAS_BATERIAS = 'pilhas_baterias';

    public const CATEGORIAS_VALIDAS = [
        self::CATEGORIA_ELETRONICOS,
        self::CATEGORIA_PILHAS_BATERIAS,
    ];

    protected $fillable = [
        'tenant_id',
        'nome',
        'categoria',
        'endereco',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /** @return HasMany<EntregaLogisticaReversa, $this> */
    public function entregas(): HasMany
    {
        return $this->hasMany(EntregaLogisticaReversa::class, 'ponto_logistica_reversa_id');
    }

    public function totalAcumuladoKg(): float
    {
        return (float) $this->entregas()->sum('quantidade_kg');
    }
}
