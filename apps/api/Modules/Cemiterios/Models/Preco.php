<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property int $tenant_id
 * @property string $servico
 * @property int $valor_centavos
 * @property \Illuminate\Support\Carbon $vigencia_inicio
 * @property \Illuminate\Support\Carbon|null $vigencia_fim
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 */
final class Preco extends Model
{
    use TenantAware;

    public const SERVICOS = [
        'concessao_temporaria', 'concessao_perpetua', 'renovacao', 'inumacao', 'exumacao',
        'trasladacao', 'taxa_manutencao_anual', 'alvara_obra',
    ];

    protected $table = 'cemetery_price_items';

    protected $guarded = ['id', 'tenant_id'];

    protected $casts = [
        'valor_centavos' => 'integer',
        'vigencia_inicio' => 'date',
        'vigencia_fim' => 'date',
    ];
}
