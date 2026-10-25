<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Educa\Services\AcademicYearStateMachine;

/**
 * Model que representa o Ano Letivo de uma Unidade Escolar.
 *
 * Governa o ciclo de vida escolar, abertura de turmas, matrículas e consolidação da LDB.
 */
final class EducaAcademicYear extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_academic_years';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'ano',
        'status',
        'is_immutable',
        'tipo_etapa_id',
        'data_inicio',
        'data_fim',
        'copiou_turmas',
        'copiou_dados_professor',
        'copiou_dados_demais_servidores',
        'observacao',
        'observacoes',
    ];

    protected $appends = [
        'observacoes',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'ano' => 'integer',
        'is_immutable' => 'boolean',
        'copiou_turmas' => 'boolean',
        'copiou_dados_professor' => 'boolean',
        'copiou_dados_demais_servidores' => 'boolean',
        'data_inicio' => 'date:Y-m-d',
        'data_fim' => 'date:Y-m-d',
    ];

    /**
     * @return BelongsTo<EducaStageType, self>
     */
    public function tipoEtapa(): BelongsTo
    {
        return $this->belongsTo(EducaStageType::class, 'tipo_etapa_id');
    }

    /**
     * @return HasMany<EducaAcademicStage>
     */
    public function etapas(): HasMany
    {
        return $this->hasMany(EducaAcademicStage::class, 'academic_year_id')->orderBy('sequencial');
    }

    public function isPlanning(): bool
    {
        return $this->status === AcademicYearStateMachine::STATUS_PLANNING;
    }

    public function isActive(): bool
    {
        return $this->status === AcademicYearStateMachine::STATUS_ACTIVE;
    }

    public function isFrozen(): bool
    {
        return $this->status === AcademicYearStateMachine::STATUS_FROZEN;
    }

    public function isEvaluationPhase(): bool
    {
        return $this->status === AcademicYearStateMachine::STATUS_EVALUATION_PHASE;
    }

    public function isClosed(): bool
    {
        return $this->status === AcademicYearStateMachine::STATUS_CLOSED;
    }

    /**
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopePlanning(Builder $query): Builder
    {
        return $query->where('status', AcademicYearStateMachine::STATUS_PLANNING);
    }

    /**
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', AcademicYearStateMachine::STATUS_ACTIVE);
    }

    /**
     * @param Builder<self> $query
     * @return Builder<self>
     */
    public function scopeClosed(Builder $query): Builder
    {
        return $query->where('status', AcademicYearStateMachine::STATUS_CLOSED);
    }

    public function getObservacoesAttribute(): ?string
    {
        return $this->attributes['observacao'] ?? null;
    }

    public function setObservacoesAttribute(?string $value): void
    {
        $this->attributes['observacao'] = $value;
    }
}
