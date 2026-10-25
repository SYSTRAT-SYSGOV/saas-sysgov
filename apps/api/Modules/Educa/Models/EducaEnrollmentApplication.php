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
use Modules\Pessoas\Models\Pessoa;

/**
 * Solicitação Formal de Inscrição / Pré-Matrícula Municipal.
 */
final class EducaEnrollmentApplication extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_enrollment_applications';

    protected $fillable = [
        'tenant_id',
        'academic_year_id',
        'numero_protocolo',
        'candidato_pessoa_id',
        'responsavel_pessoa_id',
        'etapa_ensino',
        'turno_preferencial',
        'escola_preferencia_1_id',
        'escola_preferencia_2_id',
        'escola_preferencia_3_id',
        'status',
        'criterio_pcd',
        'criterio_bolsa_familia',
        'criterio_mae_trabalhadora',
        'criterio_irmao_escola',
        'criterio_zoneamento',
        'pontuacao_total',
        'observacoes_analise',
        'analisado_por',
        'analisado_em',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'candidato_pessoa_id' => 'integer',
        'responsavel_pessoa_id' => 'integer',
        'criterio_pcd' => 'boolean',
        'criterio_bolsa_familia' => 'boolean',
        'criterio_mae_trabalhadora' => 'boolean',
        'criterio_irmao_escola' => 'boolean',
        'criterio_zoneamento' => 'boolean',
        'pontuacao_total' => 'integer',
        'analisado_por' => 'integer',
        'analisado_em' => 'datetime',
    ];

    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function candidato(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'candidato_pessoa_id');
    }

    /**
     * @return BelongsTo<Pessoa, self>
     */
    public function responsavel(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'responsavel_pessoa_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escolaPreferencia1(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'escola_preferencia_1_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escolaPreferencia2(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'escola_preferencia_2_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function escolaPreferencia3(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'escola_preferencia_3_id');
    }

    /**
     * @return BelongsTo<User, self>
     */
    public function analisador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'analisado_por');
    }

    /**
     * @return HasMany<EducaWaitlist, self>
     */
    public function waitlistEntries(): HasMany
    {
        return $this->hasMany(EducaWaitlist::class, 'application_id');
    }
}
