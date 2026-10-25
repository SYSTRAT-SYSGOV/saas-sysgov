<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Matriz Curricular da Rede Municipal.
 */
final class EducaCurriculumMatrix extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_curriculum_matrices';

    protected $fillable = [
        'tenant_id',
        'course_id',
        'grade_id',
        'nome',
        'ano_vigencia',
        'total_horas_anuais',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano_vigencia' => 'integer',
        'total_horas_anuais' => 'integer',
        'ativo' => 'boolean',
    ];

    /**
     * @return BelongsTo<EducaCourse, self>
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(EducaCourse::class, 'course_id');
    }

    /**
     * @return BelongsTo<EducaGrade, self>
     */
    public function serie(): BelongsTo
    {
        return $this->belongsTo(EducaGrade::class, 'grade_id');
    }

    /**
     * @return HasMany<EducaMatrixComponent>
     */
    public function componentes(): HasMany
    {
        return $this->hasMany(EducaMatrixComponent::class, 'matrix_id');
    }

    /**
     * @return HasMany<EducaSchoolClass>
     */
    public function turmas(): HasMany
    {
        return $this->hasMany(EducaSchoolClass::class, 'matrix_id');
    }

    /**
     * Recalcula e persiste a carga horária total anual da matriz.
     */
    public function recalcularTotalHorasAnuais(): int
    {
        $total = (int) $this->componentes()->sum('horas_anuais');
        $this->update(['total_horas_anuais' => $total]);

        return $total;
    }
}
