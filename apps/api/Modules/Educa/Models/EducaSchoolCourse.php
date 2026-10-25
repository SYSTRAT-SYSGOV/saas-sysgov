<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Oferta de Curso por Escola.
 */
final class EducaSchoolCourse extends Model
{
    use HasUuids;
    use TenantAware;

    protected $table = 'educa_school_courses';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'course_id',
        'autorizacao_ato',
        'data_autorizacao',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_autorizacao' => 'date',
    ];

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaCourse, self>
     */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(EducaCourse::class, 'course_id');
    }
}
