<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Services\Publico\VerificacaoEmailService;

/**
 * "Não recebi o e-mail" / link vencido — pede um novo (design D5/D6). Resposta sempre igual,
 * mesmo padrão anti-enumeração do cadastro e da recuperação de senha.
 */
final class PedidoNovoLinkController extends Controller
{
    public function __construct(private readonly VerificacaoEmailService $servico) {}

    public function __invoke(Request $request, TenantContext $tenantContext): JsonResponse
    {
        $dados = $request->validate(['email' => ['required', 'email']]);

        $this->servico->pedirNovoLink($tenantContext->get(), $dados['email']);

        return response()->json(['mensagem' => 'Se o cadastro estiver pendente, você vai receber um novo link por e-mail.']);
    }
}
