<?php

declare(strict_types=1);

namespace Modules\Cursos\Http\Controllers\Publico;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Modules\Cursos\Services\Publico\CadastroExternoService;

/**
 * Cadastro público do participante externo (design D6) — resposta sempre igual, para não revelar
 * se o e-mail já existe (RN de anti-enumeração, mesmo padrão do "esqueci minha senha").
 */
final class CadastroExternoController extends Controller
{
    private const string MENSAGEM = 'Se os dados estiverem corretos, você vai receber um e-mail com as próximas instruções.';

    public function __construct(private readonly CadastroExternoService $servico) {}

    public function __invoke(Request $request, TenantContext $tenantContext): JsonResponse
    {
        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160'],
            'senha' => ['required', 'string', 'confirmed', Password::min(8)->letters()->mixedCase()->numbers()->symbols()],
            'documento' => ['nullable', 'string', 'max:20'],
            'aceite' => ['required', 'accepted'],
        ]);

        $this->servico->cadastrar($tenantContext->get(), [
            'nome' => $dados['nome'],
            'email' => $dados['email'],
            'senha' => $dados['senha'],
            'documento' => $dados['documento'] ?? null,
            'aceite' => (bool) $dados['aceite'],
        ]);

        return response()->json(['mensagem' => self::MENSAGEM]);
    }
}
