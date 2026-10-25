<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Curso da Rede de Ensino (ex: Ensino Fundamental, Educação Infantil, EJA).
 */
final class EducaCourse extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_courses';

    protected $fillable = [
        'tenant_id',
        'codigo',
        'nome',
        'nivel',
        'modalidade',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
    ];

    /**
     * @return HasMany<EducaGrade>
     */
    public function series(): HasMany
    {
        return $this->hasMany(EducaGrade::class, 'course_id')->orderBy('sequencial');
    }

    /**
     * @return HasMany<EducaCurriculumMatrix>
     */
    public function matrizes(): HasMany
    {
        return $this->hasMany(EducaCurriculumMatrix::class, 'course_id');
    }
}
