<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Modules\Escola\Models\Turma;

/** Usuários ativos do tenant que podem ser vinculados como professores de turma × matéria (design D6). */
final class ProfessorController extends Controller
{
    public function __invoke(TenantContext $tenant): JsonResponse
    {
        $this->authorize('viewAny', Turma::class);

        // Professor é usuário; quando o usuário nasceu de uma pessoa, vale o nome do Cadastro de Pessoas.
        $usuarios = User::query()
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenant->id())->where('tenant_user.status', 'active'))
            ->leftJoin('pessoas_usuarios', fn ($j) => $j->on('pessoas_usuarios.user_id', '=', 'users.id')->where('pessoas_usuarios.tenant_id', $tenant->id()))
            ->leftJoin('pessoas', fn ($j) => $j->on('pessoas.id', '=', 'pessoas_usuarios.pessoa_id')->whereNull('pessoas.deleted_at'))
            ->orderByRaw('COALESCE(pessoas.nome, users.name)')
            ->get(['users.id', 'users.name', 'users.email', 'pessoas.id as pessoa_id', 'pessoas.nome as nome_pessoa']);

        return response()->json($usuarios->map(fn (User $u): array => [
            'id' => $u->id,
            'name' => $u->getAttribute('nome_pessoa') ?? $u->name,
            'email' => $u->email,
            'pessoa_id' => $u->getAttribute('pessoa_id'),
        ])->values());
    }
}
