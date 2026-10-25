<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

final class EducaConselhoCronograma extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_conselho_cronogramas';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'academic_year_id',
        'ano_letivo',
        'periodo',
        'data_inicio_pre_conselho',
        'data_fim_pre_conselho',
        'data_reuniao_conselho',
        'status',
        'observacoes',
    ];

    protected function casts(): array
    {
        return [
            'ano_letivo' => 'integer',
            'data_inicio_pre_conselho' => 'date',
            'data_fim_pre_conselho' => 'date',
            'data_reuniao_conselho' => 'date',
        ];
    }

    /**
     * @return BelongsTo<EducaSchool, $this>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<EducaAcademicYear, $this>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    /**
     * @return HasMany<EducaConselhoPreConselho, $this>
     */
    public function preConselhos(): HasMany
    {
        return $this->hasMany(EducaConselhoPreConselho::class, 'cronograma_id');
    }

    /**
     * @return HasMany<EducaConselhoAta, $this>
     */
    public function atas(): HasMany
    {
        return $this->hasMany(EducaConselhoAta::class, 'cronograma_id');
    }
}
