<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Services\RhIntegrationService;

final class RhApiController extends Controller
{
    public function __construct(
        private readonly RhIntegrationService $rhService,
    ) {}

    /**
     * Valida a API Key fornecida no cabeçalho X-RH-API-Key.
     */
    private function resolveIntegracao(Request $request): RhIntegracao
    {
        $apiKey = (string) ($request->header('X-RH-API-Key') ?? $request->bearerToken() ?? '');
        if (empty($apiKey)) {
            abort(401, 'Cabeçalho de autenticação X-RH-API-Key ausente.');
        }

        $integracao = RhIntegracao::where('api_key', $apiKey)
            ->where('is_active', true)
            ->first();

        if (!$integracao) {
            abort(403, 'Chave de API de integração de RH inválida ou inativa.');
        }

        return $integracao;
    }

    /**
     * POST /api/v1/rh/servidores/sync
     */
    public function syncServidores(Request $request): JsonResponse
    {
        $integracao = $this->resolveIntegracao($request);

        $request->validate([
            'servidores'   => ['required', 'array', 'min:1'],
            'servidores.*' => ['required', 'array'],
        ]);

        $resultado = $this->rhService->syncServidores(
            $integracao,
            (array) $request->input('servidores'),
            $request->ip()
        );

        return response()->json($resultado);
    }

    /**
     * POST /api/v1/rh/frequencia/sync
     */
    public function syncFrequencia(Request $request): JsonResponse
    {
        $integracao = $this->resolveIntegracao($request);

        $request->validate([
            'frequencias'   => ['required', 'array', 'min:1'],
            'frequencias.*' => ['required', 'array'],
        ]);

        $resultado = $this->rhService->syncFrequencia(
            $integracao,
            (array) $request->input('frequencias'),
            $request->ip()
        );

        return response()->json($resultado);
    }

    /**
     * POST /api/v1/rh/afastamentos/sync
     */
    public function syncAfastamentos(Request $request): JsonResponse
    {
        $integracao = $this->resolveIntegracao($request);

        $request->validate([
            'afastamentos'   => ['required', 'array', 'min:1'],
            'afastamentos.*' => ['required', 'array'],
        ]);

        $resultado = $this->rhService->syncAfastamentos(
            $integracao,
            (array) $request->input('afastamentos'),
            $request->ip()
        );

        return response()->json($resultado);
    }

    /**
     * GET /api/v1/rh/avaliacoes/export?ciclo_id={id}
     */
    public function exportAvaliacoes(Request $request): JsonResponse
    {
        $integracao = $this->resolveIntegracao($request);

        $request->validate([
            'ciclo_id' => ['required', 'integer'],
        ]);

        $cicloId = (int) $request->input('ciclo_id');
        $export = $this->rhService->exportAvaliacoes($integracao->tenant_id, $cicloId);

        return response()->json($export);
    }

    /**
     * POST /api/v1/rh/webhooks/test
     */
    public function testWebhook(Request $request): JsonResponse
    {
        $integracao = $this->resolveIntegracao($request);

        return response()->json([
            'status'     => 'online',
            'integracao' => $integracao->nome,
            'driver'     => $integracao->driver,
            'timestamp'  => now()->toIso8601String(),
        ]);
    }
}
