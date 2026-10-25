<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Área de Conhecimento da BNCC (ex: Linguagens, Matemática, Ciências da Natureza).
 */
final class EducaKnowledgeArea extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_knowledge_areas';

    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome',
        'secao',
        'ordem',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ordem' => 'integer',
    ];

    /**
     * @return HasMany<EducaCurriculumComponent>
     */
    public function componentes(): HasMany
    {
        return $this->hasMany(EducaCurriculumComponent::class, 'knowledge_area_id');
    }
}
