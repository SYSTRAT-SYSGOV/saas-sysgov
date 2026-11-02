<?php

declare(strict_types=1);

namespace Modules\Transporte\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;

/**
 * Valor de um parâmetro do cálculo de custo (design D-C4), por órgão e ano.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $ano
 * @property string $chave
 * @property string $valor
 * @property int|null $atualizado_por
 */
final class CustoParametro extends Model
{
    use TenantAware;

    protected $table = 'transporte_custo_parametros';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'ano', 'chave', 'valor', 'atualizado_por'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'ano' => 'integer', 'valor' => 'decimal:4', 'atualizado_por' => 'integer'];
}
