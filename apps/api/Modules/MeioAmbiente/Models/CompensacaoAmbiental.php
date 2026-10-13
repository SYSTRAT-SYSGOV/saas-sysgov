<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Compensação ambiental devida por um empreendimento de impacto significativo,
 * calculada automaticamente ao deferir seu processo de licenciamento — ver
 * `Modules\MeioAmbiente\Services\CompensacaoAmbientalService` e spec
 * `meio-ambiente/compensacao-ambiental`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $empreendimento_id
 * @property int $processo_licenciamento_id
 * @property float $percentual
 * @property int $valor_devido_centavos
 */
final class CompensacaoAmbiental extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_compensacoes_ambientais';

    /** Percentual padrão sobre o valor do empreendimento — ver design.md. */
    public const PERCENTUAL_PADRAO = 0.5;

    protected $fillable = [
        'tenant_id',
        'empreendimento_id',
        'processo_licenciamento_id',
        'percentual',
        'valor_devido_centavos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'empreendimento_id' => 'integer',
        'processo_licenciamento_id' => 'integer',
        'percentual' => 'decimal:2',
        'valor_devido_centavos' => 'integer',
    ];

    /** @return BelongsTo<Empreendimento, $this> */
    public function empreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'empreendimento_id');
    }

    /** @return BelongsTo<ProcessoLicenciamento, $this> */
    public function processoLicenciamento(): BelongsTo
    {
        return $this->belongsTo(ProcessoLicenciamento::class, 'processo_licenciamento_id');
    }

    /** @return HasMany<PagamentoCompensacao, $this> */
    public function pagamentos(): HasMany
    {
        return $this->hasMany(PagamentoCompensacao::class, 'compensacao_ambiental_id');
    }

    /** @return HasMany<DestinacaoCompensacao, $this> */
    public function destinacoes(): HasMany
    {
        return $this->hasMany(DestinacaoCompensacao::class, 'compensacao_ambiental_id');
    }

    public function valorPagoCentavos(): int
    {
        return (int) $this->pagamentos()->sum('valor_centavos');
    }

    public function valorDestinadoCentavos(): int
    {
        return (int) $this->destinacoes()->sum('valor_centavos');
    }

    public function saldoDevedorCentavos(): int
    {
        return $this->valor_devido_centavos - $this->valorPagoCentavos();
    }
}
