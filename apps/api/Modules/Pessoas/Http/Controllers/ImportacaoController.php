<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\OutboxPublisher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Pessoas\Http\Controllers\Concerns\AutorizaPermissao;
use Modules\Pessoas\Listeners\ImportarPessoaListener;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Support\Documento;

final class ImportacaoController extends Controller
{
    use AutorizaPermissao;

    public function __construct(private readonly OutboxPublisher $outbox) {}

    public function importar(Request $request): JsonResponse
    {
        $this->autorizar($request, 'cadastros.pessoas.import');

        $dados = $request->validate(['documento' => ['required', 'string']]);
        $cpf = Documento::somenteDigitos($dados['documento']);

        $integracao = PessoaIntegracao::where('is_active', true)->firstOrFail();

        $this->outbox->publish(ImportarPessoaListener::TIPO, [
            'integracao_id' => $integracao->id,
            'cpf' => $cpf,
            'tenant_id' => $integracao->tenant_id,
        ]);

        return response()->json(['message' => 'Importação agendada.'], 202);
    }
}
