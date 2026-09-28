<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Guia de recolhimento própria (RF-22/23; P03 — sem ERP).
 *
 * @property int $id
 * @property int $tenant_id
 * @property string $numero
 * @property string|null $origem_type
 * @property int|null $origem_id
 * @property int|null $holder_id
 * @property string $contribuinte_nome
 * @property string $servico
 * @property int|null $exercicio
 * @property int $valor_centavos
 * @property \Illuminate\Support\Carbon $vencimento
 * @property string $situacao
 * @property int|null $original_id
 * @property \Illuminate\Support\Carbon|null $pago_em
 * @property int|null $valor_pago_centavos
 * @property string|null $comprovante_arquivo
 * @property int|null $baixado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Guia extends Model
{
    use TenantAware;

    protected $table = 'cemetery_charges';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'valor_centavos' => 'integer',
        'valor_pago_centavos' => 'integer',
        'exercicio' => 'integer',
        'vencimento' => 'date',
        'pago_em' => 'date',
    ];

    protected $appends = ['vencida'];

    public function getVencidaAttribute(): bool
    {
        return $this->situacao === 'emitida' && $this->vencimento->isBefore(today());
    }
}
