<?php

declare(strict_types=1);

namespace App\Services\Ai;

use GuzzleHttp\Client;
use Modules\Admin\Models\AiSettings;

/**
 * Cliente do provedor de IA configurado na plataforma (hoje: NanoGPT,
 * https://docs.nano-gpt.com — API compatível com o formato OpenAI de
 * chat completions). A configuração (chave, modelo, etc.) é ÚNICA para
 * toda a plataforma (Modules\Admin\Models\AiSettings::current()) — não
 * existe configuração de IA por tenant, todos usam a mesma.
 *
 * Módulos de negócio (ex.: Licita, para sugerir texto de DFD/ETP) devem
 * depender só deste cliente, nunca montar a chamada HTTP diretamente —
 * centraliza autenticação, tratamento de erro e, se um dia o provedor for
 * trocado, é o único lugar a mudar.
 */
// Nem `final` nem `readonly`: os testes de AiSettingsController::testConnection
// mockam esta classe (Mockery não consegue dublar classes final/readonly) para
// exercitar o fluxo de sucesso sem depender de rede/da disponibilidade do
// provedor real.
class NanoGptClient
{
    private Client $http;

    public function __construct()
    {
        $this->http = new Client(['http_errors' => false, 'timeout' => 60]);
    }

    public function isConfigured(): bool
    {
        $settings = AiSettings::current();

        return $settings->enabled && filled($settings->api_key);
    }

    /**
     * @param array<int, array{role: string, content: string}> $messages
     * @param array<string, mixed> $options Sobrepõe/estende o corpo padrão da requisição (ex.: temperature).
     * @param AiSettings|null $settings Config a usar no lugar da salva — usado pelo "Testar conexão"
     *        para validar valores do formulário ainda não salvos, sem persistir nada.
     * @return array{content: string, model: string, usage: array<string, mixed>}
     *
     * @throws AiException quando a IA está desativada, sem chave configurada, ou a chamada falha.
     */
    public function chatCompletion(array $messages, array $options = [], ?AiSettings $settings = null): array
    {
        $settings ??= AiSettings::current();

        if (!$settings->enabled) {
            throw new AiException('O suporte de IA está desativado nas configurações da plataforma.');
        }

        if (blank($settings->api_key)) {
            throw new AiException('Nenhuma chave de API de IA configurada na plataforma.');
        }

        $baseUrl = rtrim($settings->base_url, '/');

        try {
            $response = $this->http->post("{$baseUrl}/chat/completions", [
                'headers' => [
                    'Authorization' => "Bearer {$settings->api_key}",
                    'Content-Type' => 'application/json',
                    'Accept' => 'application/json',
                ],
                'json' => array_merge([
                    'model' => $settings->model,
                    'messages' => $messages,
                    'max_tokens' => $settings->max_tokens,
                    'stream' => false,
                ], $options),
            ]);
        } catch (\Throwable $e) {
            throw new AiException('Falha ao conectar com o provedor de IA: ' . $e->getMessage(), previous: $e);
        }

        $body = json_decode((string) $response->getBody(), true);
        $status = $response->getStatusCode();

        if ($status >= 400 || !is_array($body)) {
            $mensagem = is_array($body) ? ($body['error']['message'] ?? null) : null;
            throw new AiException($mensagem ?? "O provedor de IA respondeu com erro (HTTP {$status}).");
        }

        $content = $body['choices'][0]['message']['content'] ?? null;

        if (!is_string($content) || $content === '') {
            throw new AiException('O provedor de IA retornou uma resposta vazia.');
        }

        return [
            'content' => $content,
            'model' => is_string($body['model'] ?? null) ? $body['model'] : $settings->model,
            'usage' => is_array($body['usage'] ?? null) ? $body['usage'] : [],
        ];
    }
}
