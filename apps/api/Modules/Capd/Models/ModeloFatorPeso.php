<?php

declare(strict_types=1);

namespace Modules\Capd\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Pivot de Peso por Fator em um Modelo de Formulário (RF-02).
 *
 * Permite configurar pesos percentuais individuais por modelo, independente
 * dos pesos globais do FatorAvaliacao. A soma de todos os pesos do modelo
 * DEVE ser 100% — validada em ModeloFatorPesoController::sync().
 *
 * O campo redistribuivel identifica fatores cujo peso pode ser redistribuído
 * proporcionalmente (ex.: alínea 'h' para cargos sem atendimento ao público).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $modelo_id
 * @property int $fator_id
 * @property float $peso         — percentual (ex.: 15.00 = 15%)
 * @property bool $redistribuivel
 * @property int $ordem
 * @property bool $ativo
 */
final class ModeloFatorPeso extends Model
{
    use TenantAware;

    protected $table = 'capd_modelo_fator_pesos';

    protected $fillable = [
        'tenant_id',
        'modelo_id',
        'fator_id',
        'peso',
        'redistribuivel',
        'ordem',
        'ativo',
    ];

    protected $casts = [
        'tenant_id'      => 'integer',
        'modelo_id'      => 'integer',
        'fator_id'       => 'integer',
        'peso'           => 'float',
        'redistribuivel' => 'boolean',
        'ordem'          => 'integer',
        'ativo'          => 'boolean',
    ];

    // ── Relacionamentos ───────────────────────────────────────────────

    public function modelo(): BelongsTo
    {
        return $this->belongsTo(ModeloFormulario::class, 'modelo_id');
    }

    public function fator(): BelongsTo
    {
        return $this->belongsTo(FatorAvaliacao::class, 'fator_id');
    }
}
