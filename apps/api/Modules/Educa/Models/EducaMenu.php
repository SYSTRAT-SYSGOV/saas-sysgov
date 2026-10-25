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
 * Cardápio Escolar homologado para o Programa Nacional de Alimentação Escolar (PNAE).
 */
final class EducaMenu extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_menus';

    protected $fillable = [
        'tenant_id',
        'academic_year_id',
        'school_id',
        'nome',
        'descricao',
        'etapa_ensino',
        'tipo_refeicao',
        'periodo',
        'vigencia_inicio',
        'vigencia_fim',
        'status',
        'responsavel_tecnico_nome',
        'responsavel_tecnico_crn',
        'homologado_em',
        'homologado_por',
        'created_by',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'vigencia_inicio' => 'date',
        'vigencia_fim' => 'date',
        'homologado_em' => 'datetime',
        'homologado_por' => 'integer',
        'created_by' => 'integer',
    ];

    /**
     * @return BelongsTo<EducaAcademicYear, self>
     */
    public function academicYear(): BelongsTo
    {
        return $this->belongsTo(EducaAcademicYear::class, 'academic_year_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * @return BelongsTo<User, self>
     */
    public function homologador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'homologado_por');
    }

    /**
     * @return BelongsTo<User, self>
     */
    public function criador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<EducaMenuItem, self>
     */
    public function items(): HasMany
    {
        return $this->hasMany(EducaMenuItem::class, 'menu_id');
    }

    /**
     * @return HasMany<EducaMealLog, self>
     */
    public function mealLogs(): HasMany
    {
        return $this->hasMany(EducaMealLog::class, 'menu_id');
    }
}
