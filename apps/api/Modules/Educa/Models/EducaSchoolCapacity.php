<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Capacidade e Oferta de Vagas de uma Escola por Etapa e Turno.
 */
final class EducaSchoolCapacity extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_school_capacities';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'academic_year_id',
        'course_id',
        'grade_id',
        'etapa_ensino',
        'turno',
        'quantidade_salas',
        'capacidade_maxima_alunos',
        'vagas_totais',
        'vagas_ocupadas',
        'vagas_reservadas',
    ];

    protected $appends = [
        'vagas_totais',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'quantidade_salas' => 'integer',
        'capacidade_maxima_alunos' => 'integer',
        'vagas_ocupadas' => 'integer',
        'vagas_reservadas' => 'integer',
    ];

    public function getVagasTotaisAttribute(): int
    {
        return (int) ($this->attributes['capacidade_maxima_alunos'] ?? 0);
    }

    public function setVagasTotaisAttribute($value): void
    {
        $this->attributes['capacidade_maxima_alunos'] = (int) $value;
    }

    /**
     * @return BelongsTo<EducaCourse, self>
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(EducaCourse::class, 'course_id');
    }

    /**
     * @return BelongsTo<EducaGrade, self>
     */
    public function grade(): BelongsTo
    {
        return $this->belongsTo(EducaGrade::class, 'grade_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }


    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    /**
     * Saldo de vagas remanescentes disponíveis para novas chamadas.
     */
    public function getVagasRemanescentesAttribute(): int
    {
        $saldo = $this->capacidade_maxima_alunos - ($this->vagas_ocupadas + $this->vagas_reservadas);

        return max(0, $saldo);
    }

    /**
     * Taxa percentual de ocupação física e regulamentar.
     */
    public function getTaxaOcupacaoPercentualAttribute(): float
    {
        if ($this->capacidade_maxima_alunos <= 0) {
            return 0.0;
        }

        $ocupacao = (($this->vagas_ocupadas + $this->vagas_reservadas) / $this->capacidade_maxima_alunos) * 100;

        return round($ocupacao, 2);
    }
}
