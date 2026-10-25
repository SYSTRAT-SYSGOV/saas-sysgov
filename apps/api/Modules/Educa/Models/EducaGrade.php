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
 * Série / Ano Escolar (ex: 1º Ano, 2º Ano, ..., 9º Ano).
 */
final class EducaGrade extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_grades';

    protected $fillable = [
        'tenant_id',
        'course_id',
        'sequencial',
        'codigo',
        'nome',
        'carga_horaria_minima_anual',
        'dias_letivos_minimos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'sequencial' => 'integer',
        'carga_horaria_minima_anual' => 'integer',
        'dias_letivos_minimos' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaCourse, self>
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(EducaCourse::class, 'course_id');
    }

    /**
     * @return HasMany<EducaCurriculumMatrix>
     */
    public function matrizes(): HasMany
    {
        return $this->hasMany(EducaCurriculumMatrix::class, 'grade_id');
    }

    /**
     * @return HasMany<EducaSchoolClass>
     */
    public function turmas(): HasMany
    {
        return $this->hasMany(EducaSchoolClass::class, 'grade_id');
    }
}
