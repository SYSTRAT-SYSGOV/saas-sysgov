<?php

declare(strict_types=1);

namespace Modules\Parecer\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Parecer\Services\AcessoParecer;

/** Auditoria do módulo (auditoria.php): registros do AuditLog com module = parecer; padrão, últimos 30 dias. */
final class AuditoriaController extends Controller
{
    public function __construct(private readonly AcessoParecer $acesso) {}

    public function __invoke(Request $request, TenantContext $tenant): JsonResponse
    {
        abort_unless($this->acesso->pode($request->user(), 'parecer.auditoria'), 403);
        $f = $request->validate([
            'de' => ['nullable', 'date_format:Y-m-d'],
            'ate' => ['nullable', 'date_format:Y-m-d'],
            'quem' => ['nullable', 'integer'],
            'recurso' => ['nullable', 'string', 'max:30'],
            'texto' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $de = $f['de'] ?? date('Y-m-d', strtotime('-30 days'));
        $ate = $f['ate'] ?? date('Y-m-d');

        $consulta = AuditLog::query()
            ->where('tenant_id', $tenant->id())
            ->where('module', 'parecer')
            ->where('created_at', '>=', $de . ' 00:00:00')
            ->where('created_at', '<=', $ate . ' 23:59:59')
            ->when($f['quem'] ?? null, fn ($q, $id) => $q->where('user_id', $id))
            ->when($f['recurso'] ?? null, fn ($q, $r) => $q->where('action', 'like', $r . '.%'))
            ->when($f['texto'] ?? null, fn ($q, $t) => $q->where(fn ($w) => $w->where('after', 'like', "%{$t}%")->orWhere('before', 'like', "%{$t}%")));
        $resumo = (clone $consulta)->selectRaw('action, COUNT(*) n')->groupBy('action')->pluck('n', 'action');
        $pagina = $consulta->orderByDesc('id')->paginate(100);
        $nomes = User::query()->whereIn('id', collect($pagina->items())->pluck('user_id')->filter()->unique())->pluck('name', 'id');
        $pessoas = User::query()->whereIn('id', AuditLog::query()->where('tenant_id', $tenant->id())->where('module', 'parecer')->whereNotNull('user_id')->distinct()->select('user_id'))->orderBy('name')->get(['id', 'name']);

        return response()->json([
            'de' => $de,
            'ate' => $ate,
            'resumo' => $resumo,
            'pessoas' => $pessoas,
            'data' => collect($pagina->items())->map(fn (AuditLog $l): array => [
                'id' => $l->id,
                'data' => $l->created_at->toIso8601String(),
                'usuario' => $l->user_id !== null ? ($nomes[$l->user_id] ?? null) : null,
                'acao' => $l->action,
                'recurso' => $l->resource,
                'descricao' => $l->after['descricao'] ?? null,
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
