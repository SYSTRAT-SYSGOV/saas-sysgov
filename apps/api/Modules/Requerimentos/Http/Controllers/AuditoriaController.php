<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Requerimentos\Models\Proposicao;

final class AuditoriaController extends Controller
{
    public function __construct(private readonly TenantContext $tenantContext) {}

    /**
     * Consulta a trilha de auditoria de uma proposição.
     *
     * `AuditLog` não é polimórfico (sem `auditable_type`/`auditable_id`) — o rastro de uma
     * proposição é identificado pelo texto de `resource` que `AuditLogger::record()` grava
     * (ex.: "Proposicao #5"), igual a qualquer outro módulo da plataforma.
     */
    public function proposicao(int $id): JsonResponse
    {
        $proposicao = Proposicao::findOrFail($id);

        $this->authorize('auditar', $proposicao);

        $logs = AuditLog::query()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('module', 'requerimentos')
            ->where('resource', "Proposicao #{$proposicao->id}")
            ->orderBy('created_at')
            ->get(['id', 'user_id', 'action', 'before', 'after', 'created_at']);

        return response()->json([
            'proposicao' => [
                'id'     => $proposicao->id,
                'numero' => $proposicao->numero,
                'status' => $proposicao->status,
            ],
            'auditoria' => $logs,
        ]);
    }

    /**
     * Lista todas as atividades de auditoria do módulo, com filtros.
     */
    public function index(Request $request): JsonResponse
    {
        // Sem Policy própria pra "toda a auditoria do módulo" (não há um único recurso aqui) —
        // checagem direta da permissão dedicada, como viewAny/create já fazem nas Policies.
        if (!$request->user()?->hasPermission('requerimentos.auditoria')) {
            abort(403);
        }

        // AuditLog não é TenantAware (tenant_id nulo-permitido, mesmo padrão de outros registros
        // de plataforma) — sem este filtro explícito, a listagem vazaria a auditoria de TODOS os
        // órgãos pra qualquer usuário com a permissão, não só a do próprio tenant.
        $query = AuditLog::query()
            ->where('tenant_id', $this->tenantContext->id())
            ->where('module', 'requerimentos')
            ->orderByDesc('created_at');

        if ($acao = $request->input('evento')) {
            $query->where('action', 'like', "%{$acao}%");
        }

        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($inicio = $request->input('periodo_inicio')) {
            $query->where('created_at', '>=', $inicio);
        }

        if ($fim = $request->input('periodo_fim')) {
            $query->where('created_at', '<=', $fim . ' 23:59:59');
        }

        $logs = $query->with('user:id,name')
            ->paginate($request->input('per_page', 50));

        return response()->json($logs);
    }
}