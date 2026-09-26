<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Uma aula do curso agendada numa turma (data e horário).
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $turma_id
 * @property int $aula_id
 * @property \Illuminate\Support\Carbon $inicio
 * @property \Illuminate\Support\Carbon $fim
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Turma $turma
 * @property-read Aula $aula
 */
final class AulaAgendamento extends Model
{
    use TenantAware;

    protected $table = 'cursos_aula_agendamentos';

    protected $fillable = ['tenant_id', 'turma_id', 'aula_id', 'inicio', 'fim'];

    protected $casts = [
        'tenant_id' => 'integer',
        'turma_id' => 'integer',
        'aula_id' => 'integer',
        'inicio' => 'datetime',
        'fim' => 'datetime',
    ];

    /** @return BelongsTo<Turma, $this> */
    public function turma(): BelongsTo
    {
        return $this->belongsTo(Turma::class, 'turma_id');
    }

    /** @return BelongsTo<Aula, $this> */
    public function aula(): BelongsTo
    {
        return $this->belongsTo(Aula::class, 'aula_id');
    }

    /** @return HasMany<Presenca, $this> */
    public function presencas(): HasMany
    {
        return $this->hasMany(Presenca::class, 'agendamento_id');
    }

    public function jaComecou(): bool
    {
        return now()->greaterThanOrEqualTo($this->inicio);
    }

    public function emAndamento(): bool
    {
        return now()->betweenIncluded($this->inicio, $this->fim);
    }
}
