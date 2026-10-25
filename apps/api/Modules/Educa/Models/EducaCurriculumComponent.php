<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Componente Curricular / Disciplina (ex: Língua Portuguesa, Matemática, História).
 */
final class EducaCurriculumComponent extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_curriculum_components';

    protected $fillable = [
        'tenant_id',
        'knowledge_area_id',
        'codigo',
        'codigo_educacenso_inep',
        'nome',
        'sigla',
        'base_curricular',
        'desconsiderar_progressao',
        'color_hex',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'desconsiderar_progressao' => 'boolean',
    ];

    /**
     * @return BelongsTo<EducaKnowledgeArea, self>
     */
    public function area(): BelongsTo
    {
        return $this->belongsTo(EducaKnowledgeArea::class, 'knowledge_area_id');
    }
}
