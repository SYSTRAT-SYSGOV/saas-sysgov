<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;

/**
 * Atendimento da equipe multiprofissional (D5); o relato do sigiloso só sai pela regra da policy (D6).
 *
 * @property int $id
 * @property int $tenant_id
 * @property \Illuminate\Support\Carbon|null $data_hora
 * @property string $turno
 * @property int $escola_id
 * @property int|null $equipe_id
 * @property string|null $relato
 * @property bool $sigiloso
 * @property int|null $criado_por
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property Equipe|null $equipe
 * @property \App\Models\User|null $autor
 * @property \Illuminate\Database\Eloquent\Collection<int, \Modules\Escola\Models\Aluno> $alunos
 * @property \Illuminate\Database\Eloquent\Collection<int, Profissional> $profissionais
 * @property \Illuminate\Database\Eloquent\Collection<int, TipoAtendimento> $tipos
 */
final class Atendimento extends Model
{
    use SoftDeletes;
    use TenantAware;

    public const TURNOS = ['manha' => 'Manhã', 'tarde' => 'Tarde', 'noite' => 'Noite', 'integral' => 'Integral'];

    protected $table = 'multi_atendimentos';

    protected $fillable = ['tenant_id', 'data_hora', 'turno', 'escola_id', 'equipe_id', 'relato', 'sigiloso', 'criado_por'];

    protected $casts = [
        'tenant_id' => 'integer',
        'data_hora' => 'datetime',
        'escola_id' => 'integer',
        'equipe_id' => 'integer',
        'sigiloso' => 'boolean',
        'criado_por' => 'integer',
    ];

    /** @return BelongsTo<Escola, $this> */
    public function escola(): BelongsTo
    {
        return $this->belongsTo(Escola::class, 'escola_id');
    }

    /** @return BelongsTo<Equipe, $this> */
    public function equipe(): BelongsTo
    {
        return $this->belongsTo(Equipe::class, 'equipe_id');
    }

    /** @return BelongsTo<User, $this> */
    public function autor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'criado_por');
    }

    /** @return BelongsToMany<Aluno, $this> */
    public function alunos(): BelongsToMany
    {
        return $this->belongsToMany(Aluno::class, 'multi_atendimento_alunos', 'atendimento_id', 'aluno_id')
            ->withoutGlobalScope('escola')->withTrashed();
    }

    /** @return BelongsToMany<Profissional, $this> */
    public function profissionais(): BelongsToMany
    {
        return $this->belongsToMany(Profissional::class, 'multi_atendimento_profissionais', 'atendimento_id', 'profissional_id');
    }

    /** @return BelongsToMany<TipoAtendimento, $this> */
    public function tipos(): BelongsToMany
    {
        return $this->belongsToMany(TipoAtendimento::class, 'multi_atendimento_tipos', 'atendimento_id', 'tipo_id');
    }
}
