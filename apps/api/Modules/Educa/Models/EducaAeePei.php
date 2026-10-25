<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Plano Educacional Individualizado (PEI) do Estudante PAEE.
 */
final class EducaAeePei extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_aee_peis';

    protected $fillable = [
        'tenant_id',
        'student_profile_id',
        'academic_year_id',
        'ano_letivo',
        'semestre',
        'habilidades_atuais',
        'necessidades_especificas',
        'adequacoes_curriculares',
        'adaptacoes_avaliativas',
        'metodologias_especificas',
        'parecer_descritivo',
        'status',
        'elaborado_por_user_id',
        'aprovado_por_user_id',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano_letivo' => 'integer',
        'semestre' => 'integer',
        'elaborado_por_user_id' => 'integer',
        'aprovado_por_user_id' => 'integer',
    ];

    public function studentProfile(): BelongsTo
    {
        return $this->belongsTo(EducaAeeStudentProfile::class, 'student_profile_id');
    }

    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    public function elaboradoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'elaborado_por_user_id');
    }

    public function aprovadoPor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'aprovado_por_user_id');
    }

    public function goals(): HasMany
    {
        return $this->hasMany(EducaAeePeiGoal::class, 'pei_id');
    }
}
