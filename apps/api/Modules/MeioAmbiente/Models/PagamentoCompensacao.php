<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pagamento (parcial ou total) de uma compensação ambiental.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $compensacao_ambiental_id
 * @property int $valor_centavos
 * @property \Illuminate\Support\Carbon $pago_em
 * @property string|null $comprovante
 */
final class PagamentoCompensacao extends Model
{
    use TenantAware;

    protected $table = 'meio_ambiente_pagamentos_compensacao';

    protected $fillable = [
        'tenant_id',
        'compensacao_ambiental_id',
        'valor_centavos',
        'pago_em',
        'comprovante',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'compensacao_ambiental_id' => 'integer',
        'valor_centavos' => 'integer',
        'pago_em' => 'date',
    ];

    /** @return BelongsTo<CompensacaoAmbiental, $this> */
    public function compensacaoAmbiental(): BelongsTo
    {
        return $this->belongsTo(CompensacaoAmbiental::class, 'compensacao_ambiental_id');
    }
}
