<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Destinação de valores pagos de compensação ambiental (fundo municipal de meio
 * ambiente ou unidade de conservação específica).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $compensacao_ambiental_id
 * @property string $destino
 * @property int $valor_centavos
 * @property \Illuminate\Support\Carbon $registrada_em
 */
final class DestinacaoCompensacao extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_destinacoes_compensacao';

    public const DESTINO_FUNDO_MUNICIPAL = 'fundo_municipal';
    public const DESTINO_UNIDADE_CONSERVACAO = 'unidade_conservacao';

    public const DESTINOS_VALIDOS = [
        self::DESTINO_FUNDO_MUNICIPAL,
        self::DESTINO_UNIDADE_CONSERVACAO,
    ];

    protected $fillable = [
        'tenant_id',
        'compensacao_ambiental_id',
        'destino',
        'valor_centavos',
        'registrada_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'compensacao_ambiental_id' => 'integer',
        'valor_centavos' => 'integer',
        'registrada_em' => 'datetime',
    ];

    /** @return BelongsTo<CompensacaoAmbiental, $this> */
    public function compensacaoAmbiental(): BelongsTo
    {
        return $this->belongsTo(CompensacaoAmbiental::class, 'compensacao_ambiental_id');
    }
}
