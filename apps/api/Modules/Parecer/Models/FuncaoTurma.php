<?php

declare(strict_types=1);

namespace Modules\Parecer\Models;

use App\Models\Concerns\TenantAware;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Modules\Escola\Models\Concerns\EscolaAware;

/**
 * Função de um usuário numa turma (regente, História e Geografia, …, diretor). Ver Catalogo::FUNCOES.
 *
 * @property int $id
 * @property int $tenant_id
 * @property int $escola_id
 * @property int $turma_id
 * @property string $funcao
 * @property int $user_id
 */
final class FuncaoTurma extends Model
{
    use TenantAware;
    use EscolaAware;

    protected $table = 'parecer_turma_funcoes';

    /** @var list<string> */
    protected $fillable = ['tenant_id', 'turma_id', 'funcao', 'user_id'];

    /** @var array<string, string> */
    protected $casts = ['tenant_id' => 'integer', 'turma_id' => 'integer', 'user_id' => 'integer', 'escola_id' => 'integer'];

    /** @return BelongsTo<User, $this> */
    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
