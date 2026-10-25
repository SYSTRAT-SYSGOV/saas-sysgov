<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Etapas individuais do ano letivo (1º Bimestre, 2º Bimestre, etc.).
 */
final class EducaAcademicStage extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_academic_stages';

    protected $fillable = [
        'tenant_id',
        'academic_year_id',
        'sequencial',
        'data_inicio',
        'data_fim',
        'dias_letivos',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'sequencial' => 'integer',
        'data_inicio' => 'date:Y-m-d',
        'data_fim' => 'date:Y-m-d',
        'dias_letivos' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }
}
