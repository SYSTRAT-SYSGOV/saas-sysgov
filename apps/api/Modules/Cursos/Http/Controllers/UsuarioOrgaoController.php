<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers;

use App\Models\User;
use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Models\Curso;

/**
 * Busca de usuários ativos do órgão para designar instrutores e inscrever
 * participantes. Existe aqui (e não reaproveita /users) para não exigir do
 * Administrador de Cursos a permissão de gestão de usuários da plataforma.
 */
final class UsuarioOrgaoController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $this->authorize('create', Curso::class);
        $busca = trim((string) $request->query('busca', ''));
        $tenantId = app(TenantContext::class)->id();

        $usuarios = User::query()
            ->where('is_active', true)
            ->whereHas('tenants', fn ($q) => $q->where('tenants.id', $tenantId)->where('tenant_user.status', 'active'))
            ->when($busca !== '', fn ($q) => $q->where(fn ($w) => $w->where('name', 'like', "%{$busca}%")->orWhere('email', 'like', "%{$busca}%")))
            ->orderBy('name')
            ->limit(50)
            ->get(['id', 'name', 'email']);

        return response()->json($usuarios);
    }
}
