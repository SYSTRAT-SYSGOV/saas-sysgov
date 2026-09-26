<?php

declare(strict_types=1);

namespace Modules\Cursos\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Modules\Cursos\Enums\Modalidade;
use Modules\Cursos\Enums\StatusTurma;

/**
 * @property int $id
 * @property int $tenant_id
 * @property int $curso_id
 * @property string $nome
 * @property \Illuminate\Support\Carbon $data_inicio
 * @property \Illuminate\Support\Carbon $data_fim
 * @property \Illuminate\Support\Carbon $inscricoes_inicio
 * @property \Illuminate\Support\Carbon $inscricoes_fim
 * @property int $vagas
 * @property string $modalidade
 * @property string|null $local
 * @property string|null $link
 * @property bool $aprovacao_manual
 * @property string $status
 * @property \Illuminate\Support\Carbon|null $encerrada_em
 * @property int|null $encerrada_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read Curso $curso
 * @property-read \Illuminate\Database\Eloquent\Collection<int, User> $instrutores
 * @property-read \Illuminate\Database\Eloquent\Collection<int, AulaAgendamento> $agendamentos
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Inscricao> $inscricoes
 */
final class Turma extends Model
{
    use TenantAware;

    protected $table = 'cursos_turmas';

    protected $fillable = [
        'tenant_id', 'curso_id', 'nome', 'data_inicio', 'data_fim', 'inscricoes_inicio', 'inscricoes_fim',
        'vagas', 'modalidade', 'local', 'link', 'aprovacao_manual', 'status', 'encerrada_em', 'encerrada_por',
    ];

    protected $casts = [
        'tenant_id' => 'integer',
        'curso_id' => 'integer',
        'data_inicio' => 'date',
        'data_fim' => 'date',
        'inscricoes_inicio' => 'datetime',
        'inscricoes_fim' => 'datetime',
        'vagas' => 'integer',
        'aprovacao_manual' => 'boolean',
        'encerrada_em' => 'datetime',
        'encerrada_por' => 'integer',
    ];

    public function statusEnum(): StatusTurma
    {
        return StatusTurma::from($this->status);
    }

    public function modalidadeEnum(): Modalidade
    {
        return Modalidade::from($this->modalidade);
    }

    /** @return BelongsTo<Curso, $this> */
    public function curso(): BelongsTo
    {
        return $this->belongsTo(Curso::class, 'curso_id');
    }

    /**
     * Pivot com tenant_id próprio (passado explicitamente no attach/sync).
     *
     * @return BelongsToMany<User, $this>
     */
    public function instrutores(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'cursos_turma_instrutores', 'turma_id', 'user_id')
            ->withPivot('tenant_id')
            ->withTimestamps();
    }

    /** @return HasMany<AulaAgendamento, $this> */
    public function agendamentos(): HasMany
    {
        return $this->hasMany(AulaAgendamento::class, 'turma_id')->orderBy('inicio');
    }

    /** @return HasMany<Inscricao, $this> */
    public function inscricoes(): HasMany
    {
        return $this->hasMany(Inscricao::class, 'turma_id');
    }

    public function temInstrutor(int $userId): bool
    {
        return $this->instrutores()->where('users.id', $userId)->exists();
    }
}
