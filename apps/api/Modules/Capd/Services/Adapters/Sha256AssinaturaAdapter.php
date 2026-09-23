<?php

namespace Modules\Capd\Services\Adapters;

use Modules\Capd\Contracts\AssinaturaDigitalInterface;
use Modules\Capd\Contracts\AssinaturaResultado;

/**
 * Adapter SHA-256 Interno (modo gratuito, padrão).
 *
 * Gera hash SHA-256 canônico do JSON estruturado da ata.
 * Válido juridicamente como prova administrativa (art. 6º, Lei 13.709/2018)
 * quando associado ao log de acesso autenticado do usuário.
 *
 * O hash é recalculável a qualquer momento para verificação de integridade.
 */
final class Sha256AssinaturaAdapter implements AssinaturaDigitalInterface
{
    public function assinar(
        string $textoAta,
        int    $sessaoId,
        int    $usuarioId,
        array  $contexto = [],
    ): AssinaturaResultado {
        // Hash direto do texto da ata — recalculável a qualquer momento com o
        // mesmo texto (é isso que torna a integridade verificável, RN-C06).
        $hash = hash('sha256', $textoAta);

        return new AssinaturaResultado(
            hash:                  $hash,
            tipo:                  'sha256_interno',
            urlDocumentoAssinado:  null,
            certificadoSerial:     null,
            assinadoEm:            now()->toIso8601String(),
        );
    }

    public function verificar(string $textoAta, string $hash): bool
    {
        return hash_equals(hash('sha256', $textoAta), $hash);
    }

    public function identificador(): string
    {
        return 'sha256';
    }

    /** Modo gratuito não usa certificado digital — nada a validar. */
    public function validarCertificado(string $certificado): bool
    {
        return true;
    }
}
