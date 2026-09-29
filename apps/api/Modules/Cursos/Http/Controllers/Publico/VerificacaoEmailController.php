<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Cursos\Services\Publico\VerificacaoEmailService;

/**
 * Clique no link do e-mail (design D5/D6) — o token sozinho já diz qual usuário e qual órgão,
 * então esta rota não precisa do `{orgao}` nem do `ResolvePublicTenant` (mesma lógica da
 * validação de certificado): roda sem `TenantContext`.
 */
final class VerificacaoEmailController extends Controller
{
    public function __construct(private readonly VerificacaoEmailService $servico) {}

    public function __invoke(Request $request): JsonResponse
    {
        $dados = $request->validate(['token' => ['required', 'string']]);

        $this->servico->verificar($dados['token']);

        return response()->json(['mensagem' => 'E-mail verificado. Você já pode entrar.']);
    }
}
