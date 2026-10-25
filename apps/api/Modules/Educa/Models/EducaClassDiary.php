<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Diário de Classe - Registro de Aulas Ministradas.
 */
final class EducaClassDiary extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    public const STATUS_RASCUNHO = 'rascunho';
    public const STATUS_PUBLICADO = 'publicado';

    protected $table = 'educa_class_diaries';

    protected $fillable = [
        'tenant_id',
        'school_class_id',
        'curriculum_component_id',
        'data_aula',
        'quantidade_aulas',
        'conteudo',
        'habilidades_bncc',
        'status',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'quantidade_aulas' => 'integer',
        'data_aula' => 'date:Y-m-d',
    ];

    /**
     * @return BelongsTo<EducaSchoolClass, self>
     */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(EducaSchoolClass::class, 'school_class_id');
    }

    /**
     * @return BelongsTo<EducaCurriculumComponent, self>
     */
    public function componente(): BelongsTo
    {
        return $this->belongsTo(EducaCurriculumComponent::class, 'curriculum_component_id');
    }

    /**
     * @return HasMany<EducaAttendanceRecord>
     */
    public function presencas(): HasMany
    {
        return $this->hasMany(EducaAttendanceRecord::class, 'class_diary_id');
    }
}
