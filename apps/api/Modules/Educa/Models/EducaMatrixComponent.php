<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Item / Componente Curricular vinculado a uma Matriz.
 */
final class EducaMatrixComponent extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_matrix_components';

    protected $fillable = [
        'tenant_id',
        'matrix_id',
        'component_id',
        'horas_semanais',
        'horas_anuais',
        'tipo_nota',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'horas_semanais' => 'integer',
        'horas_anuais' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaCurriculumMatrix, self>
     */
    public function matriz(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumMatrix::class, 'matrix_id');
    }

    /**
     * @return BelongsTo<EducaCurriculumComponent, self>
     */
    public function componente(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumComponent::class, 'component_id');
    }
}
