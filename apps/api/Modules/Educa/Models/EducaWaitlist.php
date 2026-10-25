<?php

declare(strict_types=1);

namespace Modules\Educa\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Posição Classificada na Fila de Espera Escolar (Lei 14.685/2023).
 */
final class EducaWaitlist extends Model
{
    use HasUuids;
    use SoftDeletes;
    use TenantAware;

    protected $table = 'educa_waitlists';

    protected $fillable = [
        'tenant_id',
        'application_id',
        'school_id',
        'etapa_ensino',
        'turno',
        'posicao',
        'prioridade_legal',
        'pontuacao',
        'status',
        'convocado_em',
        'limite_comparecimento',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'posicao' => 'integer',
        'prioridade_legal' => 'boolean',
        'pontuacao' => 'integer',
        'convocado_em' => 'datetime',
        'limite_comparecimento' => 'datetime',
    ];

    /**
     * @return BelongsTo<EducaEnrollmentApplication, self>
     */
    public function application(): BelongsTo
    {
        return $this->belongsTo(EducaEnrollmentApplication::class, 'application_id');
    }

    /**
     * @return BelongsTo<EducaSchool, self>
     */
    public function school(): BelongsTo
    {
        return $this->belongsTo(EducaSchool::class, 'school_id');
    }

    /**
     * Verifica se o candidato convocado ainda está dentro do prazo de SLA de comparecimento.
     */
    public function isPrazoVigente(): bool
    {
        if ($this->status !== 'convocado' || $this->limite_comparecimento === null) {
            return false;
        }

        return now()->lessThanOrEqualTo($this->limite_comparecimento);
    }
}
