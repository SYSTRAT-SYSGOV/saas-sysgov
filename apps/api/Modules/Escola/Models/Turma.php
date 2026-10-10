<?php

declare(strict_types=1);

namespace Modules\Escola\Models;

use App\Models\Concerns\TenantAware;
use Modules\Escola\Models\Concerns\EscolaAware;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turno_id
 * @property int|null $pedagoga_id
 * @property string $nome
 * @property int $ano_letivo
 * @property-read Turno|null $turno
 * @property-read MembroEquipe|null $pedagoga
 * @property-read \Illuminate\Database\Eloquent\Collection<int, TurmaMateria> $vinculos
 */
final class Turma extends Model
{
    use SoftDeletes;
    use TenantAware;
    use EscolaAware;

    protected $table = 'escola_turmas';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'turno_id', 'pedagoga_id', 'nome', 'ano_letivo'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'turno_id' => 'integer', 'pedagoga_id' => 'integer', 'ano_letivo' => 'integer'];

    /** @return BelongsTo<Turno, $this> */
    public function turno(): BelongsTo
    {
        return $this->belongsTo(Turno::class, 'turno_id')->withTrashed();
    }

    /**
     * Pedagoga da equipe cadastrada.
     *
     * @return BelongsTo<MembroEquipe, $this>
     */
    public function pedagoga(): BelongsTo
    {
        return $this->belongsTo(MembroEquipe::class, 'pedagoga_id');
    }

    /** @return HasMany<Aluno, $this> */
    public function alunos(): HasMany
    {
        return $this->hasMany(Aluno::class, 'turma_id');
    }

    /** @return HasMany<TurmaMateria, $this> */
    public function vinculos(): HasMany
    {
        return $this->hasMany(TurmaMateria::class, 'turma_id');
    }
}
