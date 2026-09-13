<?php

declare(strict_types=1);

namespace Modules\Capd\Http\Controllers;

use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Models\RhSyncLog;

final class RhIntegrationController extends Controller
{
    public function index(): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $integracoes = RhIntegracao::where('tenant_id', $tenantId)
            ->withCount('logs')
            ->get();

        return response()->json($integracoes);
    }

    public function store(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $validated = $request->validate([
            'nome'           => ['required', 'string', 'max:100'],
            'driver'         => ['required', 'string', 'in:betha,ipm,senior,totvs,generic_rest'],
            'api_url'        => ['nullable', 'url', 'max:500'],
            'api_token'      => ['nullable', 'string'],
            'webhook_url'    => ['nullable', 'url', 'max:500'],
            'field_mappings' => ['nullable', 'array'],
        ]);

        $validated['tenant_id'] = $tenantId;
        $validated['api_key'] = 'rh_' . Str::random(40);
        $validated['webhook_secret'] = 'whsec_' . Str::random(32);

        $integracao = RhIntegracao::create($validated);

        return response()->json($integracao, 201);
    }

    public function update(Request $request, RhIntegracao $integracao): JsonResponse
    {
        $validated = $request->validate([
            'nome'           => ['sometimes', 'string', 'max:100'],
            'driver'         => ['sometimes', 'string', 'in:betha,ipm,senior,totvs,generic_rest'],
            'api_url'        => ['nullable', 'url', 'max:500'],
            'api_token'      => ['nullable', 'string'],
            'webhook_url'    => ['nullable', 'url', 'max:500'],
            'field_mappings' => ['nullable', 'array'],
            'is_active'      => ['nullable', 'boolean'],
        ]);

        $integracao->update($validated);

        return response()->json($integracao);
    }

    public function regenerateKey(RhIntegracao $integracao): JsonResponse
    {
        $integracao->update([
            'api_key' => 'rh_' . Str::random(40),
        ]);

        return response()->json([
            'message' => 'Nova chave de API gerada com sucesso.',
            'api_key' => $integracao->api_key,
        ]);
    }

    public function logs(Request $request): JsonResponse
    {
        $tenantId = (int) app(TenantContext::class)->id();
        $perPage = (int) $request->input('per_page', 20);

        $logs = RhSyncLog::where('tenant_id', $tenantId)
            ->with('integracao:id,nome,driver')
            ->latest()
            ->paginate($perPage);

        return response()->json($logs);
    }
}
