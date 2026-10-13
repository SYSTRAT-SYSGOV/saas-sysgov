<?php

declare(strict_types=1);

namespace Modules\Passeio\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Passeio\Enums\StatusPasseio;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property string $nome
 * @property \Illuminate\Support\Carbon $data_passeio
 * @property \Illuminate\Support\Carbon|null $data_limite_autorizacao
 * @property int $valor_centavos
 * @property string $status
 */
final class Passeio extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'passeio_passeios';

    /** @var list<string> */
    protected $fillable = [
        'tenant_id', 'nome', 'data_passeio', 'data_limite_autorizacao', 'horario_saida', 'horario_retorno', 'local_saida',
        'destino', 'cidade', 'valor_centavos', 'responsavel', 'observacoes', 'status',
    ];

    /** @var array<string, string> */
    protected $casts = [
        'tenant_id' => 'integer', 'data_passeio' => 'date:Y-m-d', 'data_limite_autorizacao' => 'date:Y-m-d', 'valor_centavos' => 'integer',
    ];

    public function statusEnum(): StatusPasseio
    {
        return StatusPasseio::from($this->status);
    }

    /** @return HasMany<Inscricao, $this> */
    public function inscricoes(): HasMany
    {
        return $this->hasMany(Inscricao::class, 'passeio_id');
    }

    /** @return HasMany<Veiculo, $this> */
    public function veiculos(): HasMany
    {
        return $this->hasMany(Veiculo::class, 'passeio_id');
    }

    /** @return HasMany<Assento, $this> */
    public function assentos(): HasMany
    {
        return $this->hasMany(Assento::class, 'passeio_id');
    }
}
