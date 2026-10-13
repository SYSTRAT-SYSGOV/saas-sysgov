<?php

declare(strict_types=1);

namespace Modules\Campanha\Models\Referencia;

use Illuminate\Database\Eloquent\Model;

/**
 * Malha geográfica (GeoJSON dos municípios) de uma UF, do IBGE (D3, D7).
 *
 * @property string $uf
 * @property string $geojson
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class RefMalha extends Model
{
    protected $table = 'campanha_ref_malhas';

    protected $primaryKey = 'uf';

    public $incrementing = false;

    protected $keyType = 'string';

    protected $guarded = [];
}
