<?php

declare(strict_types=1);

namespace Modules\Vistoria\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Propriedade rural, estabelecimento, feira, evento ou demais locais sujeitos
 * à fiscalização da Secretaria de Agricultura.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $proprietario_pessoa_id
 * @property string $nome
 * @property string $tipo
 * @property string|null $classificacao_atividade
 * @property float $latitude
 * @property float $longitude
 * @property string|null $endereco
 */
final class LocalFiscalizavel extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'vistoria_locais';

    public const TIPO_PROPRIEDADE_RURAL = 'propriedade_rural';
    public const TIPO_ESTABELECIMENTO_COMERCIAL = 'estabelecimento_comercial';
    public const TIPO_FEIRA = 'feira';
    public const TIPO_EVENTO = 'evento';
    public const TIPO_OUTRO = 'outro';

    protected $fillable = [
        'tenant_id',
        'proprietario_pessoa_id',
        'nome',
        'tipo',
        'classificacao_atividade',
        'latitude',
        'longitude',
        'endereco',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'proprietario_pessoa_id' => 'integer',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function proprietario(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'proprietario_pessoa_id');
    }

    /** @return HasMany<OrdemServico, $this> */
    public function ordensServico(): HasMany
    {
        return $this->hasMany(OrdemServico::class, 'local_id');
    }
}
