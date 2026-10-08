<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Licença de lançamento de efluentes vinculada a um empreendimento, com parâmetros
 * de qualidade exigidos — ver spec `meio-ambiente/recursos-hidricos`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $empreendimento_id
 * @property \Illuminate\Support\Carbon $validade_em
 */
final class LicencaLancamentoEfluente extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_licencas_lancamento_efluente';

    /** Validade padrão, em dias, a partir do cadastro — parametrização inicial, ver design.md. */
    public const VALIDADE_DIAS = 1825;

    protected $fillable = [
        'tenant_id',
        'empreendimento_id',
        'validade_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'empreendimento_id' => 'integer',
        'validade_em' => 'date',
    ];

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }

    /** @return HasMany<ParametroQualidadeEfluente, $this> */
    public function parametros(): HasMany
    {
        return $this->hasMany(ParametroQualidadeEfluente::class, 'licenca_lancamento_efluente_id');
    }

    public function temNaoConformidade(): bool
    {
        return $this->parametros()
            ->whereHas('medicoes', fn ($query) => $query->where('conforme', false))
            ->exists();
    }
}
