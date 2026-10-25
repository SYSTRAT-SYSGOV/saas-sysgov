<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Item / Preparação culinária do Cardápio com informações nutricionais.
 */
final class EducaMenuItem extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_menu_items';

    protected $fillable = [
        'tenant_id',
        'menu_id',
        'dia_semana',
        'nome_preparacao',
        'ingredientes',
        'medida_caseira',
        'porcao_gramas',
        'calorias_kcal',
        'carboidratos_g',
        'proteinas_g',
        'lipidios_g',
        'fibras_g',
        'sodio_mg',
        'alergenos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'dia_semana' => 'integer',
        'porcao_gramas' => 'float',
        'calorias_kcal' => 'float',
        'carboidratos_g' => 'float',
        'proteinas_g' => 'float',
        'lipidios_g' => 'float',
        'fibras_g' => 'float',
        'sodio_mg' => 'float',
        'alergenos' => 'array',
    ];

    /**
     * @return BelongsTo<EducaMenu, self>
     */
    public function menu(): BelongsTo
    {
        return $this->belongsTo(EducaMenu::class, 'menu_id');
    }
}
