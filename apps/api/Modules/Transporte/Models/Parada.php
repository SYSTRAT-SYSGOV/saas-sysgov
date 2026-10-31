<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Ponto de parada do itinerário. Latitude e longitude andam juntas (ambas ou nenhuma).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $nome
 * @property string|null $descricao
 * @property string|null $latitude
 * @property string|null $longitude
 * @property string|null $cep
 * @property string|null $logradouro
 * @property string|null $numero
 * @property string|null $complemento
 * @property string|null $bairro
 * @property string|null $cidade
 * @property string|null $uf
 * @property string|null $referencia
 * @property bool $ativa
 */
final class Parada extends Model
{
    use TenantAware;

    protected $table = 'transporte_paradas';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'nome', 'descricao', 'latitude', 'longitude', 'cep', 'logradouro', 'numero', 'complemento', 'bairro',
        'cidade', 'uf', 'referencia', 'ativa',
    ];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'ativa' => 'boolean'];

    public function temCoordenadas(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }
}
