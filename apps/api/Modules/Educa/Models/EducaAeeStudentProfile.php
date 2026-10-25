<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Pessoas\Models\Pessoa;

/**
 * Prontuário e Perfil do Estudante da Educação Especial (PAEE).
 */
final class EducaAeeStudentProfile extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_aee_student_profiles';

    protected $fillable = [
        'tenant_id',
        'enrollment_id',
        'pessoa_id',
        'school_id',
        'tipo_condicao',
        'cid10_codigo',
        'cid11_codigo',
        'diagnostico_descricao',
        'laudo_medico_url',
        'laudo_medico_emitido_em',
        'laudo_medico_expira_em',
        'profissional_emissor',
        'registro_profissional',
        'precisa_cuidador',
        'precisa_interprete_libras',
        'precisa_guia_interprete',
        'precisa_transporte_adaptado',
        'barreiras_identificadas',
        'recursos_acessibilidade',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'precisa_cuidador' => 'boolean',
        'precisa_interprete_libras' => 'boolean',
        'precisa_guia_interprete' => 'boolean',
        'precisa_transporte_adaptado' => 'boolean',
        'barreiras_identificadas' => 'array',
        'recursos_acessibilidade' => 'array',
        'laudo_medico_emitido_em' => 'date',
        'laudo_medico_expira_em' => 'date',
    ];

    public function enrollment(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollment::class, 'enrollment_id');
    }

    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    public function peis(): HasMany
    {
        return $this->hasMany(EducaAeePei::class, 'student_profile_id');
    }

    public function aeeEnrollments(): HasMany
    {
        return $this->hasMany(EducaAeeEnrollment::class, 'student_profile_id');
    }

    public function supportAllocations(): HasMany
    {
        return $this->hasMany(EducaAeeSupportAllocation::class, 'student_profile_id');
    }
}
