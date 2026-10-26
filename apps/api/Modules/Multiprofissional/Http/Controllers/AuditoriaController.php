<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Multiprofissional\Policies\MultiprofissionalPolicy;

/** Trilha do módulo (audit_logs com module = multiprofissional) do tenant ativo, mais recentes primeiro. */
final class AuditoriaController extends Controller
{
    public function __construct(
        private readonly MultiprofissionalPolicy $policy,
    ) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($this->policy->auditar($request->user()), 403);
        $filtros = $request->validate([
            'acao' => ['nullable', 'string', 'max:60'],
            'recurso' => ['nullable', 'string', 'max:60'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pagina = AuditLog::query()
            ->where('tenant_id', app(\App\Support\TenantContext::class)->id())
            ->where('module', 'multiprofissional')
            ->when($filtros['acao'] ?? null, fn ($q, $a) => $q->where('action', $a))
            ->when($filtros['recurso'] ?? null, fn ($q, $r) => $q->where('resource', $r))
            ->orderByDesc('id')
            ->paginate((int) ($filtros['per_page'] ?? 50));

        $nomes = User::query()->whereIn('id', collect($pagina->items())->pluck('user_id')->filter()->unique())->pluck('name', 'id');

        return response()->json([
            'data' => collect($pagina->items())->map(fn (AuditLog $l): array => [
                'id' => $l->id,
                'data' => $l->created_at->toIso8601String(),
                'usuario' => $l->user_id !== null ? ($nomes[$l->user_id] ?? null) : null,
                'acao' => $l->action,
                'recurso' => $l->resource,
                'detalhes' => $l->after ?? $l->before,
                'ip' => $l->ip,
            ])->values(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }
}
