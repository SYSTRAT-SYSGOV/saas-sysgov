<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Habilitação Curricular Docente.
 */
final class EducaTeacherQualification extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_teacher_qualifications';

    protected $fillable = [
        'tenant_id',
        'employee_id',
        'curriculum_component_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaEmployee, self>
     */
    public function servidor(): BelongsTo
    {
        return $this->belongsTo(EducaEmployee::class, 'employee_id');
    }

    /**
     * @return BelongsTo<EducaCurriculumComponent, self>
     */
    public function componenteCurricular(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumComponent::class, 'curriculum_component_id');
    }
}
