<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Http\Requests\ImportarPessoaRequest;
use Modules\Pessoas\Listeners\ImportarPessoaListener;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Support\Documento;

final class ImportacaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(
        private readonly OutboxPublisher $outbox,
        private readonly AuditLogger $audit,
    ) {}

    public function importar(ImportarPessoaRequest $request): JsonResponse
    {
        $this->authorize('import', Pessoa::class);

        $dados = $request->validated();
        $cpf = Documento::somenteDigitos($dados['documento']);

        $integracao = PessoaIntegracao::where('is_active', true)->firstOrFail();

        $this->outbox->publish(ImportarPessoaListener::TIPO, [
            'integracao_id' => $integracao->id,
            'cpf' => $cpf,
            'tenant_id' => $integracao->tenant_id,
        ]);

        $this->audit->record('pessoas', 'pessoa.importacao_solicitada', "CPF {$cpf}", null, [
            'integracao_id' => $integracao->id,
            'cpf_hash' => Documento::hash($cpf),
        ]);

        return response()->json(['message' => 'Importação agendada.'], 202);
    }
}
