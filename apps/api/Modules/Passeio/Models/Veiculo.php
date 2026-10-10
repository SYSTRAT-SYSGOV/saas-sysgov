<?php

declare(strict_types=1);

namespace Modules\Passeio\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $passeio_id
 * @property string $identificacao
 * @property string|null $placa
 * @property string|null $motorista
 * @property string|null $telefone
 * @property int $capacidade
 * @property string|null $cor
 * @property-read Passeio|null $passeio
 */
final class Veiculo extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'passeio_veiculos';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'passeio_id', 'identificacao', 'placa', 'motorista', 'telefone', 'capacidade', 'cor'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'passeio_id' => 'integer', 'capacidade' => 'integer'];

    /** @return BelongsTo<Passeio, $this> */
    public function passeio(): BelongsTo
    {
        return $this->belongsTo(Passeio::class, 'passeio_id');
    }

    /** @return HasMany<Assento, $this> */
    public function assentos(): HasMany
    {
        return $this->hasMany(Assento::class, 'veiculo_id');
    }
}
