<?php

declare(strict_types=1);

namespace App\Notificacoes;

use App\Models\Tenant;

/** Resolve a Identidade de um órgão a partir de Tenant.settings (design D4). */
final class ResolvedorIdentidade
{
    public function resolver(?Tenant $tenant): Identidade
    {
        if ($tenant === null) {
            return Identidade::padrao();
        }

        $settings = (array) ($tenant->settings ?? []);

        return new Identidade(
            titulo: $settings['portalTitle'] ?? $tenant->name,
            corPrimaria: $settings['customPrimaryColor'] ?? null,
            logoUrl: $settings['customLogoUrl'] ?? null,
            assinaturaOculta: (bool) ($settings['hideProviderSignature'] ?? false),
        );
    }
}
