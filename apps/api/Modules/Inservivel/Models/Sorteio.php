<?php

declare(strict_types=1);

namespace Modules\Inservivel\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Sorteio de um lote (D8): vencedora, regra aplicada, semente, retrato dos participantes e hash de conferência.
 *
 * @property int $id
 * @property int $lote_id
 * @property int $entidade_vencedora_id
 * @property Carbon $data_sorteio
 * @property string $regra unica_inscrita | menos_lotes | sorteio_semente
 * @property string|null $semente
 * @property list<array<string, mixed>> $participantes
 * @property list<int>|null $empatadas
 * @property string $hash
 * @property-read Entidade $vencedora
 * @property-read Lote $lote
 */
final class Sorteio extends Model
{
    use TenantAware;

    protected $table = 'inservivel_sorteios';

    protected $fillable = ['tenant_id', 'lote_id', 'entidade_vencedora_id', 'data_sorteio', 'regra', 'semente', 'participantes', 'empatadas', 'hash', 'realizado_por'];

    protected $casts = [
        'tenant_id' => 'integer',
        'lote_id' => 'integer',
        'entidade_vencedora_id' => 'integer',
        'data_sorteio' => 'datetime',
        'participantes' => 'array',
        'empatadas' => 'array',
    ];

    /** @return BelongsTo<Entidade, $this> */
    public function vencedora(): BelongsTo
    {
        return $this->belongsTo(Entidade::class, 'entidade_vencedora_id');
    }

    /** @return BelongsTo<Lote, $this> */
    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class, 'lote_id');
    }
}
