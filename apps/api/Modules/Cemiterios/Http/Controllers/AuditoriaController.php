<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cemiterios\Http\Controllers\Concerns\AutorizaPermissao;

/** Consulta da auditoria do módulo e verificação da cadeia de hash (RNF-08). */
final class AuditoriaController extends Controller
{
    use AutorizaPermissao;

    public function index(Request $request, TenantContext $tenant): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.auditoria.view');

        return response()->json(
            AuditLog::where('tenant_id', $tenant->id())->where('module', 'cemiterios')
                ->when($request->query('action'), fn ($q, $v) => $q->where('action', 'like', "{$v}%"))
                ->when($request->query('resource'), fn ($q, $v) => $q->where('resource', $v))
                ->orderByDesc('id')
                ->paginate(min((int) $request->query('per_page', 50), 200), ['id', 'user_id', 'action', 'resource', 'ip', 'created_at'])
        );
    }

    /**
     * Recalcula a cadeia inteira (é global: cada registro aponta o anterior de
     * qualquer tenant) e devolve o primeiro registro adulterado, sem expor dados.
     * ponytail: varredura O(n) em lotes; guardar checkpoints se a tabela ficar enorme.
     */
    public function verificar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cemiterios.auditoria.view');

        $anterior = null;
        $verificados = 0;
        $quebra = null;

        AuditLog::query()->orderBy('id')->chunk(1000, function ($lote) use (&$anterior, &$verificados, &$quebra): bool {
            foreach ($lote as $log) {
                $esperado = hash('sha256', implode('|', [
                    (string) ($log->tenant_id ?? ''),
                    (string) ($log->user_id ?? ''),
                    $log->action,
                    $log->resource,
                    (string) json_encode($log->before),
                    (string) json_encode($log->after),
                    $log->created_at->format('Y-m-d H:i:s'),
                    (string) ($log->prev_hash ?? ''),
                ]));

                if ($log->prev_hash !== $anterior || !hash_equals($esperado, (string) $log->hash)) {
                    $quebra = $log->id;

                    return false;
                }
                $anterior = $log->hash;
                $verificados++;
            }

            return true;
        });

        return response()->json(['integra' => $quebra === null, 'quebra_em' => $quebra, 'verificados' => $verificados]);
    }
}
