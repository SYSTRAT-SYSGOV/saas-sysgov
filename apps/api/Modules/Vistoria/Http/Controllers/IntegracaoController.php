<?php

declare(strict_types=1);

namespace Modules\Vistoria\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Vistoria\Models\VistoriaIntegracao;
use Modules\Vistoria\Services\IntegracaoVistoriaService;

final class IntegracaoController extends Controller
{
    public function __construct(
        private readonly IntegracaoVistoriaService $service,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->autorizar($request);

        return response()->json(VistoriaIntegracao::orderByDesc('created_at')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $this->autorizar($request);

        $dados = $request->validate(['nome' => ['required', 'string', 'max:100']]);
        $integracao = $this->service->criar($dados['nome']);

        // Única vez em que o api_key aparece em texto puro — normalmente oculto ($hidden).
        return response()->json([
            'id' => $integracao->id,
            'nome' => $integracao->nome,
            'api_key' => $integracao->getRawOriginal('api_key'),
        ], 201);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $this->autorizar($request);

        $integracao = VistoriaIntegracao::findOrFail($id);
        $this->service->revogar($integracao);

        return response()->json(['message' => 'Integração revogada.']);
    }

    /** Gestão de credenciais M2M é restrita à chefia — mesmo critério do painel gerencial. */
    private function autorizar(Request $request): void
    {
        $user = $request->user();
        abort_unless($user->is_platform_admin || $user->hasPermission('vistoria.chefia'), 403);
    }
}
