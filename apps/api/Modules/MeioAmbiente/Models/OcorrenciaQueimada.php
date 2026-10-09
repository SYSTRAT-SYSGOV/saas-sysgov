<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Pessoas\Models\Pessoa;

/**
 * Ocorrência de queimada, com responsável quando identificado (pessoa física do
 * Cadastro Único ou empreendimento cadastrado) — ver spec `meio-ambiente/queimadas`.
 *
 * @property int $id
 * @property int $tenant_id
 * @property \Illuminate\Support\Carbon $data_ocorrencia
 * @property float $latitude
 * @property float $longitude
 * @property float|null $area_queimada_ha
 * @property int|null $responsavel_pessoa_id
 * @property int|null $responsavel_empreendimento_id
 * @property int|null $auto_infracao_ambiental_id
 * @property string $situacao
 * @property array<string, mixed>|null $referencia_imagem_satelite
 */
final class OcorrenciaQueimada extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_ocorrencias_queimada';

    public const SITUACAO_RESPONSAVEL_IDENTIFICADO = 'responsavel_identificado';
    public const SITUACAO_RESPONSAVEL_NAO_IDENTIFICADO = 'responsavel_nao_identificado';

    protected $fillable = [
        'tenant_id',
        'data_ocorrencia',
        'latitude',
        'longitude',
        'area_queimada_ha',
        'responsavel_pessoa_id',
        'responsavel_empreendimento_id',
        'auto_infracao_ambiental_id',
        'situacao',
        'referencia_imagem_satelite',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_ocorrencia' => 'date',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'area_queimada_ha' => 'decimal:2',
        'responsavel_pessoa_id' => 'integer',
        'responsavel_empreendimento_id' => 'integer',
        'auto_infracao_ambiental_id' => 'integer',
        'referencia_imagem_satelite' => 'array',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function responsavelPessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'responsavel_pessoa_id');
    }

    /** @return BelongsTo<Empreendimento, $this> */
    public function responsavelEmpreendimento(): BelongsTo
    {
        return $this->belongsTo(Empreendimento::class, 'responsavel_empreendimento_id');
    }

    /** @return BelongsTo<AutoInfracaoAmbiental, $this> */
    public function autoInfracaoAmbiental(): BelongsTo
    {
        return $this->belongsTo(AutoInfracaoAmbiental::class, 'auto_infracao_ambiental_id');
    }
}
