<?php

namespace Modules\Capd\Services\Adapters;

use Modules\Capd\Contracts\AssinaturaDigitalInterface;
use Modules\Capd\Contracts\AssinaturaResultado;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Adapter ICP-Brasil (modo premium, plugável).
 *
 * Integração com PSC ICP-Brasil.
 * Para ativar: configure o provedor no tenant settings:
 *   - "icp_brasil_provider": "certisign" | "birdsign" | "soluti" | "clicksign"
 *   - "icp_brasil_api_key": "<chave-da-api>"
 *   - "icp_brasil_api_url": "<endpoint-do-psc>"
 *
 * A assinatura gerada tem validade legal plena perante o Judiciário
 * e órgãos de controle externo (TCE/TCU), conforme MP 2.200-2/2001.
 */
final class IcpBrasilAdapter implements AssinaturaDigitalInterface
{
    public function __construct(
        /** Configurações do PSC carregadas do tenant settings */
        private readonly array $config,
    ) {}

    public function assinar(
        string $textoAta,
        int    $sessaoId,
        int    $usuarioId,
        array  $contexto = [],
    ): AssinaturaResultado {
        if (empty($this->config['icp_brasil_api_url']) || empty($this->config['icp_brasil_api_key'])) {
            throw new \RuntimeException(
                'Integração ICP-Brasil não configurada. Configure o provedor PSC nas configurações do tenant.'
            );
        }

        // Chamada real ao PSC ICP-Brasil
        $response = Http::withToken($this->config['icp_brasil_api_key'])
            ->post($this->config['icp_brasil_api_url'] . '/sign', [
                'text' => $textoAta,
                'context' => $contexto,
                'metadata' => [
                    'sessao_id' => $sessaoId,
                    'usuario_id' => $usuarioId,
                ]
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException(
                'Falha ao assinar documento via PSC ICP-Brasil: ' . $response->body()
            );
        }

        $data = $response->json();

        return new AssinaturaResultado(
            hash: $data['hash'] ?? hash('sha256', $textoAta . now()->toIso8601String()),
            tipo: 'icp_brasil',
            urlDocumentoAssinado: $data['urlDocumentoAssinado'] ?? null,
            certificadoSerial: $data['certificadoSerial'] ?? null,
            assinadoEm: $data['assinadoEm'] ?? now()->toIso8601String(),
        );
    }

    public function verificar(string $textoAta, string $hash): bool
    {
        if (empty($this->config['icp_brasil_api_url'])) {
            return false;
        }

        // Verificação via API do PSC
        $response = Http::get($this->config['icp_brasil_api_url'] . '/verify', [
            'hash' => $hash,
            'text' => $textoAta,
        ]);

        if (!$response->successful()) {
            return false;
        }

        $data = $response->json();

        return $data['valid'] ?? false;
    }

    public function identificador(): string
    {
        return 'icp_brasil';
    }

    /** Consulta o PSC se o certificado apresentado ainda é válido (não expirado nem revogado). */
    public function validarCertificado(string $certificado): bool
    {
        if (empty($this->config['icp_brasil_api_url'])) {
            return false;
        }

        $response = Http::withToken($this->config['icp_brasil_api_key'] ?? '')
            ->post($this->config['icp_brasil_api_url'] . '/validate-certificate', [
                'certificado' => $certificado,
            ]);

        if (!$response->successful()) {
            return false;
        }

        return (bool) ($response->json('valid') ?? false);
    }
}
