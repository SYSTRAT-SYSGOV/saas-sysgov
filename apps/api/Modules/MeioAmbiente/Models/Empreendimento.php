<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Empreendimento ou atividade potencialmente poluidora sujeita a licenciamento,
 * fiscalização, compensação ambiental e outorga de recursos hídricos. Titular pode
 * ser pessoa física já cadastrada no Cadastro Único (`titular_pessoa_id`) ou pessoa
 * jurídica com CNPJ/razão social próprios — ver `Modules\MeioAmbiente\Services\EmpreendimentoService`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int|null $titular_pessoa_id
 * @property string|null $cnpj
 * @property string|null $razao_social
 * @property string $atividade
 * @property string $porte
 * @property bool $impacto_significativo
 * @property int|null $valor_empreendimento_centavos
 * @property float $latitude
 * @property float $longitude
 */
final class Empreendimento extends Model
{
    use TenantAware;
    use SoftDeletes;

    protected $table = 'meio_ambiente_empreendimentos';

    public const PORTE_PEQUENO = 'pequeno';
    public const PORTE_MEDIO = 'medio';
    public const PORTE_GRANDE = 'grande';

    public const PORTES_VALIDOS = [
        self::PORTE_PEQUENO,
        self::PORTE_MEDIO,
        self::PORTE_GRANDE,
    ];

    protected $fillable = [
        'tenant_id',
        'titular_pessoa_id',
        'cnpj',
        'razao_social',
        'atividade',
        'porte',
        'impacto_significativo',
        'valor_empreendimento_centavos',
        'latitude',
        'longitude',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'titular_pessoa_id' => 'integer',
        'impacto_significativo' => 'boolean',
        'valor_empreendimento_centavos' => 'integer',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function titular(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'titular_pessoa_id');
    }

    /** @return HasOne<ResponsavelTecnico, $this> */
    public function responsavelTecnico(): HasOne
    {
        return $this->hasOne(ResponsavelTecnico::class, 'empreendimento_id');
    }

    /** @return HasMany<ProcessoLicenciamento, $this> */
    public function processosLicenciamento(): HasMany
    {
        return $this->hasMany(ProcessoLicenciamento::class, 'empreendimento_id');
    }

    /** @return HasMany<AutoInfracaoAmbiental, $this> */
    public function autosInfracao(): HasMany
    {
        return $this->hasMany(AutoInfracaoAmbiental::class, 'empreendimento_id');
    }

    /** @return HasMany<OutorgaAgua, $this> */
    public function outorgasAgua(): HasMany
    {
        return $this->hasMany(OutorgaAgua::class, 'empreendimento_id');
    }

    /** @return HasMany<LicencaLancamentoEfluente, $this> */
    public function licencasLancamentoEfluente(): HasMany
    {
        return $this->hasMany(LicencaLancamentoEfluente::class, 'empreendimento_id');
    }

    /** @return HasMany<GeradorResiduo, $this> */
    public function geradoresResiduo(): HasMany
    {
        return $this->hasMany(GeradorResiduo::class, 'empreendimento_id');
    }

    /** @return HasMany<CompensacaoAmbiental, $this> */
    public function compensacoesAmbientais(): HasMany
    {
        return $this->hasMany(CompensacaoAmbiental::class, 'empreendimento_id');
    }
}
