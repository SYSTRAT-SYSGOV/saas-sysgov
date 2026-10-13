<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Modules\Pessoas\Models\Pessoa;

/**
 * Profissional da equipe multiprofissional: sempre uma pessoa do Cadastro de Pessoas (D2) e, se tiver acesso ao
 * sistema, um usuário do tenant (D3). O nome e o CPF mascarado são cópia para exibição; o CPF fica só em Pessoas.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $pessoa_id
 * @property int|null $user_id
 * @property int $cargo_id
 * @property string $nome
 * @property string $cpf_mascarado
 * @property string|null $registro_profissional
 * @property string|null $telefone
 * @property bool $ativo
 * @property \App\Models\User|null $usuario
 * @property Cargo|null $cargo
 * @property \Illuminate\Database\Eloquent\Collection<int, Equipe> $equipes
 * @property \Illuminate\Database\Eloquent\Relations\Pivot|null $pivot
 */
final class Profissional extends Model
{
    use TenantAware;

    protected $table = 'multi_profissionais';

    protected $fillable = ['tenant_id', 'pessoa_id', 'user_id', 'cargo_id', 'nome', 'cpf_mascarado', 'registro_profissional', 'telefone', 'ativo'];

    protected $casts = [
        'tenant_id' => 'integer',
        'pessoa_id' => 'integer',
        'user_id' => 'integer',
        'cargo_id' => 'integer',
        'ativo' => 'boolean',
    ];

    /** @return BelongsTo<Pessoa, $this> */
    public function pessoa(): BelongsTo
    {
        return $this->belongsTo(Pessoa::class, 'pessoa_id');
    }

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<Cargo, $this> */
    public function cargo(): BelongsTo
    {
        return $this->belongsTo(Cargo::class, 'cargo_id');
    }

    /** @return BelongsToMany<Equipe, $this> */
    public function equipes(): BelongsToMany
    {
        return $this->belongsToMany(Equipe::class, 'multi_equipe_profissionais', 'profissional_id', 'equipe_id');
    }
}
