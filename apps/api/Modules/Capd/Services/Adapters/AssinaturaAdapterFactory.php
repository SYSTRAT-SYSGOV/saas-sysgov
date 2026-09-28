<?php

declare(strict_types=1);

namespace Modules\Capd\Services\Adapters;

use App\Support\TenantContext;
use Modules\Capd\Contracts\AssinaturaDigitalInterface;
use Modules\Capd\Models\Sessao;

/**
 * Resolve o adapter de assinatura digital para uma sessão, conforme
 * `capd_ciclos.tipo_assinatura_ata` (design.md › Integração ICP-Brasil via
 * Adapter Pattern). `sha256` (padrão, gratuito) não exige nenhuma
 * configuração; `icp_brasil` lê o provedor/credenciais das configurações do
 * tenant (nunca do usuário nem de env compartilhado entre tenants).
 */
final readonly class AssinaturaAdapterFactory
{
    public function __construct(private TenantContext $tenant) {}

    public function paraSessao(Sessao $sessao): AssinaturaDigitalInterface
    {
        $ciclo = $sessao->comissao?->ciclo;
        if (! $ciclo instanceof \Modules\Capd\Models\CicloAvaliacao || ! $ciclo->usaAssinaturaIcp()) {
            return new Sha256AssinaturaAdapter();
        }

        $settings = (array) ($this->tenant->get()->settings ?? []);

        return new IcpBrasilAdapter([
            'icp_brasil_provider' => $settings['icp_brasil_provider'] ?? null,
            'icp_brasil_api_key' => $settings['icp_brasil_api_key'] ?? null,
            'icp_brasil_api_url' => $settings['icp_brasil_api_url'] ?? null,
        ]);
    }
}
