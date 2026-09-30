<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Listeners\ImportarPessoaListener;
use Modules\Pessoas\Models\PessoaSyncLog;

final class SyncLogController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly OutboxPublisher $outbox) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.integracoes.manage');

        $filtros = $request->validate([
            'integracao_id' => ['nullable', 'integer'],
            'status' => ['nullable', Rule::in(['sucesso', 'erro', 'nao_encontrado'])],
            'per_page' => ['nullable', 'integer'],
        ]);

        $logs = PessoaSyncLog::query()
            ->when($filtros['integracao_id'] ?? null, fn ($q, $id) => $q->where('integracao_id', $id))
            ->when($filtros['status'] ?? null, fn ($q, $status) => $q->where('status', $status))
            ->latest()
            ->paginate((int) ($filtros['per_page'] ?? 25));

        return response()->json($logs);
    }

    public function reprocessar(Request $request, PessoaSyncLog $syncLog): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.integracoes.manage');

        if (empty($syncLog->cpf) || empty($syncLog->integracao_id)) {
            return response()->json(['message' => 'Este registro de histórico não pode ser reprocessado: CPF ou integração não disponíveis.'], 422);
        }

        $this->outbox->publish(ImportarPessoaListener::TIPO, [
            'integracao_id' => $syncLog->integracao_id,
            'cpf' => $syncLog->cpf,
            'tenant_id' => $syncLog->tenant_id,
        ]);

        return response()->json(['message' => 'Reprocessamento agendado.'], 202);
    }
}
