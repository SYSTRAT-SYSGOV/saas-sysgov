<?php

declare(strict_types=1);

namespace Modules\Transporte\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Transporte\Policies\TransportePolicy;

/** Trilha do módulo (audit_logs com module = transporte) do tenant ativo, mais recentes primeiro. */
final class AuditoriaController extends Controller
{
    public function __construct(private readonly TransportePolicy $policy) {}

    public function __invoke(Request $request): JsonResponse
    {
        abort_unless($this->policy->auditar($request->user()), 403);
        $filtros = $request->validate([
            'acao' => ['nullable', 'string', 'max:60'],
            'recurso' => ['nullable', 'string', 'max:60'],
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
            'usuario_id' => ['nullable', 'integer'],
            'usuario' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $pagina = AuditLog::query()
            ->where('tenant_id', app(TenantContext::class)->id())
            ->where('module', 'transporte')
            ->when($filtros['acao'] ?? null, fn ($q, $a) => $q->where('action', $a))
            ->when($filtros['recurso'] ?? null, fn ($q, $r) => $q->where('resource', 'like', $r . '%'))
            ->when($filtros['de'] ?? null, fn ($q, $d) => $q->where('created_at', '>=', \Illuminate\Support\Carbon::parse($d)->startOfDay()))
            ->when($filtros['ate'] ?? null, fn ($q, $d) => $q->where('created_at', '<=', \Illuminate\Support\Carbon::parse($d)->endOfDay()))
            ->when($filtros['usuario_id'] ?? null, fn ($q, $u) => $q->where('user_id', $u))
            ->when($filtros['usuario'] ?? null, fn ($q, $nome) => $q->whereIn('user_id', User::query()->where('name', 'like', '%' . $nome . '%')->select('id')))
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
                'antes' => $l->before,
                'depois' => $l->after,
                'ip' => $l->ip,
            ])->values(),
            'current_page' => $pagina->currentPage(),
            'last_page' => $pagina->lastPage(),
            'total' => $pagina->total(),
        ]);
    }
}
