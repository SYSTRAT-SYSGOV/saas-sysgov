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
 * Sala de Recursos Multifuncionais (SRM) para Atendimento no Contraturno.
 */
final class EducaAeeResourceRoom extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_aee_resource_rooms';

    protected $fillable = [
        'tenant_id',
        'school_id',
        'nome',
        'tipo_sala',
        'capacidade_atendimento',
        'equipamentos_disponiveis',
        'horarios_disponiveis',
        'is_polo',
        'is_active',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'capacidade_atendimento' => 'integer',
        'equipamentos_disponiveis' => 'array',
        'horarios_disponiveis' => 'array',
        'is_polo' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(EducaAeeEnrollment::class, 'resource_room_id');
    }
}
