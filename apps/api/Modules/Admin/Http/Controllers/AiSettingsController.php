<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use App\Services\Ai\AiException;
use App\Services\Ai\NanoGptClient;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Admin\Models\AiSettings;

/**
 * Configuração ÚNICA de IA da plataforma (Modules\Admin\Models\AiSettings)
 * — usada por todos os tenants, gerenciável só pelo Admin SYSTRAT. Nunca
 * devolve a api_key em texto puro (ver `present()`): o formulário no
 * front-end só mostra os 4 últimos dígitos, e reenviar sem preenchê-la de
 * novo mantém a chave já salva.
 */
final class AiSettingsController
{
    public function show(): JsonResponse
    {
        return response()->json($this->present(AiSettings::current()));
    }

    public function update(Request $request, AuditLogger $audit): JsonResponse
    {
        $this->autorizarGerenciamento($request);

        $data = $request->validate([
            'enabled' => ['required', 'boolean'],
            'provider' => ['required', 'string', 'max:40'],
            'base_url' => ['required', 'url', 'max:255'],
            'model' => ['required', 'string', 'max:120'],
            'max_tokens' => ['required', 'integer', 'min:64', 'max:32000'],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $settings = AiSettings::current();
        $before = $this->present($settings);

        $settings->fill([
            'enabled' => $data['enabled'],
            'provider' => $data['provider'],
            'base_url' => rtrim($data['base_url'], '/'),
            'model' => $data['model'],
            'max_tokens' => $data['max_tokens'],
        ]);

        if (filled($data['api_key'] ?? null)) {
            $settings->api_key = $data['api_key'];
        }

        $settings->updated_by = $request->user()?->getKey();
        $settings->save();

        $audit->record('admin', 'ai_settings.update', 'ai_settings:1', $before, $this->present($settings));

        return response()->json($this->present($settings));
    }

    /**
     * Testa a conexão com o provedor de IA usando os valores do FORMULÁRIO
     * (ainda não salvos) — cai para o valor já salvo em qualquer campo
     * omitido, então o admin pode testar uma chave nova sem antes salvá-la,
     * ou testar mudando só o modelo mantendo a chave atual.
     */
    public function testConnection(Request $request, NanoGptClient $client): JsonResponse
    {
        $this->autorizarGerenciamento($request);

        $data = $request->validate([
            'provider' => ['sometimes', 'string', 'max:40'],
            'base_url' => ['sometimes', 'url', 'max:255'],
            'model' => ['sometimes', 'string', 'max:120'],
            'api_key' => ['sometimes', 'nullable', 'string', 'max:1000'],
        ]);

        $salvo = AiSettings::current();

        $transiente = new AiSettings([
            'enabled' => true,
            'provider' => $data['provider'] ?? $salvo->provider,
            'base_url' => rtrim($data['base_url'] ?? $salvo->base_url, '/'),
            'model' => $data['model'] ?? $salvo->model,
            'max_tokens' => 32,
            'api_key' => filled($data['api_key'] ?? null) ? $data['api_key'] : $salvo->api_key,
        ]);

        if (blank($transiente->api_key)) {
            return response()->json(['ok' => false, 'message' => 'Informe uma chave de API para testar.'], 422);
        }

        try {
            $resultado = $client->chatCompletion(
                [['role' => 'user', 'content' => 'Responda apenas "ok".']],
                [],
                $transiente,
            );
        } catch (AiException $e) {
            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }

        return response()->json(['ok' => true, 'message' => 'Conexão bem-sucedida.', 'model' => $resultado['model']]);
    }

    /** @return array<string, mixed> */
    private function present(AiSettings $settings): array
    {
        $key = $settings->api_key;

        return [
            'enabled' => $settings->enabled,
            'provider' => $settings->provider,
            'baseUrl' => $settings->base_url,
            'model' => $settings->model,
            'maxTokens' => $settings->max_tokens,
            'apiKeyConfigured' => filled($key),
            'apiKeyMasked' => filled($key) ? ('••••' . substr($key, -4)) : null,
            'updatedAt' => $settings->updated_at?->toIso8601String(),
        ];
    }

    private function autorizarGerenciamento(Request $request): void
    {
        abort_unless(
            (bool) $request->user()?->is_platform_admin,
            403,
            'Apenas administradores da plataforma podem gerenciar a configuração de IA.',
        );
    }
}
