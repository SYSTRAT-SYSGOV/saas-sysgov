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

final class EducaConselhoPreConselho extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_conselho_pre_conselhos';

    protected $fillable = [
        'tenant_id',
        'cronograma_id',
        'school_class_id',
        'curriculum_component_id',
        'professor_user_id',
        'periodo',
        'desempenho_geral_turma',
        'objetivos_atingidos_percentual',
        'metodologias_utilizadas',
        'dificuldades_detectadas',
        'acoes_intervencao_sugeridas',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'objetivos_atingidos_percentual' => 'integer',
            'metodologias_utilizadas' => 'array',
        ];
    }

    /**
     * @return BelongsTo<EducaConselhoCronograma, $this>
     */
    public function cronograma(): BelongsTo
    {
        return $this->belongsTo(EducaConselhoCronograma::class, 'cronograma_id');
    }

    /**
     * @return BelongsTo<EducaSchoolClass, $this>
     */
    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'school_class_id');
    }

    /**
     * @return BelongsTo<EducaCurriculumComponent, $this>
     */
    public function curriculumComponent(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumComponent::class, 'curriculum_component_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function professor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'professor_user_id');
    }

    /**
     * @return HasMany<EducaConselhoPreConselhoAluno, $this>
     */
    public function alunosSinalizados(): HasMany
    {
        return $this->hasMany(EducaConselhoPreConselhoAluno::class, 'pre_conselho_id');
    }
}
