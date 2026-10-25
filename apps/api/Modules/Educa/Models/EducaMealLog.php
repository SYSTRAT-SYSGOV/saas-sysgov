<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Registro Diário de Refeições Servidas por Escola e Controle de Desperdício (CAE/FNDE).
 */
final class EducaMealLog extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_meal_logs';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'menu_id',
        'data_consumo',
        'tipo_refeicao',
        'total_previsto',
        'total_servido',
        'taxa_adesao_percentual',
        'sobra_limpa_kg',
        'resto_ingesta_kg',
        'temperatura_servico_celsius',
        'observacoes',
        'responsavel_registro_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_consumo' => 'date',
        'total_previsto' => 'integer',
        'total_servido' => 'integer',
        'taxa_adesao_percentual' => 'float',
        'sobra_limpa_kg' => 'float',
        'resto_ingesta_kg' => 'float',
        'temperatura_servico_celsius' => 'float',
        'responsavel_registro_id' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaMenu, self>
     */
    public function menu(): BelongsTo
    {
        return $this->belongsTo(EducaMenu::class, 'menu_id');
    }

    /**
     * @return BelongsTo<User, self>
     */
    public function responsavelRegistro(): BelongsTo
    {
        return $this->belongsTo(User::class, 'responsavel_registro_id');
    }
}
