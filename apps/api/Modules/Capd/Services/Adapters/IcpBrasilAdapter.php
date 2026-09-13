<?php

namespace Modules\Capd\Services\Adapters;

use Modules\Capd\Contracts\AssinaturaDigitalInterface;
use Modules\Capd\Contracts\AssinaturaResultado;

/**
 * Adapter ICP-Brasil (modo premium, plugável).
 *
 * Stub de integração com PSC ICP-Brasil.
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
        // TODO: Implementar chamada real ao PSC ICP-Brasil configurado.
        // Por ora, lança exceção informativa para que o tenant ative o provedor.
        throw new \RuntimeException(
            'Integração ICP-Brasil não configurada. ' .
            'Configure o provedor PSC nas configurações do tenant ' .
            '(icp_brasil_provider, icp_brasil_api_key, icp_brasil_api_url) ' .
            'ou utilize o modo SHA-256 interno.',
        );
    }

    public function verificar(string $textoAta, string $hash): bool
    {
        // TODO: Verificação via API do PSC
        return false;
    }

    public function identificador(): string
    {
        return 'icp_brasil';
    }
}
