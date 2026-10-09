<?php

declare(strict_types=1);

namespace Modules\MeioAmbiente\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Modules\MeioAmbiente\Models\MeioAmbienteIntegracao;
use Modules\MeioAmbiente\Services\IntegracaoMeioAmbienteService;

/** Gestão das credenciais de integração com órgãos de controle (`meio_ambiente.integracoes.manage`). */
final class IntegracaoController extends Controller
{
    public function __construct(
        private readonly IntegracaoMeioAmbienteService $integracoes,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('viewAny', MeioAmbienteIntegracao::class);

        $integracoes = MeioAmbienteIntegracao::query()->latest('id')->get();

        return response()->json(['data' => $integracoes->map(fn (MeioAmbienteIntegracao $i): array => $this->paraJson($i))]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', MeioAmbienteIntegracao::class);

        $dados = $request->validate([
            'nome' => ['required', 'string', 'max:100'],
            'orgao' => ['required', Rule::in(MeioAmbienteIntegracao::ORGAOS_VALIDOS)],
            // Só HTTPS: o token do órgão vai no header Authorization.
            'envio_url' => ['nullable', 'url:https', 'max:500'],
            'envio_token' => ['nullable', 'string', 'max:500', 'required_with:envio_url'],
        ]);

        ['integracao' => $integracao, 'api_key' => $apiKey] = $this->integracoes->criar($dados);

        // Única vez em que a chave aparece em texto puro — no banco fica só o hash.
        return response()->json([...$this->paraJson($integracao), 'api_key' => $apiKey], 201);
    }

    public function destroy(MeioAmbienteIntegracao $meioAmbienteIntegracao): JsonResponse
    {
        $this->authorize('delete', $meioAmbienteIntegracao);

        return response()->json($this->paraJson($this->integracoes->revogar($meioAmbienteIntegracao)));
    }

    /** @return array<string, mixed> */
    private function paraJson(MeioAmbienteIntegracao $integracao): array
    {
        return [
            'id' => $integracao->id,
            'nome' => $integracao->nome,
            'orgao' => $integracao->orgao,
            'api_key_prefixo' => $integracao->api_key_prefixo,
            'is_active' => $integracao->is_active,
            'ultimo_uso_em' => $integracao->ultimo_uso_em?->toIso8601String(),
            'envio_ativo' => $integracao->envio_url !== null,
            'envio_url' => $integracao->envio_url,
            'created_at' => $integracao->created_at->toIso8601String(),
        ];
    }
}
