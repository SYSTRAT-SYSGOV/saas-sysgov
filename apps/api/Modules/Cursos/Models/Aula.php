<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $curso_id
 * @property string $titulo
 * @property string|null $descricao
 * @property int $ordem
 * @property int $duracao_minutos
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Curso $curso
 */
final class Aula extends Model
{
    use TenantAware;

    protected $table = 'cursos_aulas';

    protected $fillable = ['tenant_id', 'curso_id', 'titulo', 'descricao', 'ordem', 'duracao_minutos'];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'ordem' => 'integer',
        'duracao_minutos' => 'integer',
    ];

    /** @return BelongsTo<Curso, $this> */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /** @return HasMany<AulaAgendamento, $this> */
    public function agendamentos(): HasMany
    {
        return $this->hasMany(AulaAgendamento::class, 'aula_id');
    }
}
