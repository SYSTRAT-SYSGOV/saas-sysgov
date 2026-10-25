<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Catálogo de Tipos de Etapa (Bimestral, Trimestral, Semestral).
 */
final class EducaStageType extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_stage_types';

    protected $fillable = [
        'tenant_id',
        'nome',
        'num_etapas',
        'ativo',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'num_etapas' => 'integer',
        'ativo' => 'boolean',
    ];

    /**
     * @return HasMany<EducaAcademicYear>
     */
    public function academicYears(): HasMany
    {
        return $this->hasMany(EducaAcademicYear::class, 'tipo_etapa_id');
    }
}
