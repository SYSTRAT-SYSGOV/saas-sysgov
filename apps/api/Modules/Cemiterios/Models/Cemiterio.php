<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $codigo
 * @property string $nome
 * @property string|null $endereco
 * @property string $tipo
 * @property string $situacao
 * @property string|null $responsavel
 * @property float|null $lat
 * @property float|null $lng
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 */
final class Cemiterio extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'cemetery_parks';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = ['lat' => 'float', 'lng' => 'float'];

    /** @return HasMany<Setor, $this> */
    public function setores(): HasMany
    {
        return $this->hasMany(Setor::class, 'park_id');
    }

    /** @return HasMany<Jazigo, $this> */
    public function jazigos(): HasMany
    {
        return $this->hasMany(Jazigo::class, 'park_id');
    }
}
