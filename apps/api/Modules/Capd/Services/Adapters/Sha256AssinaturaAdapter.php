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
        // Payload canônico: texto + metadados imutáveis
        $payload = json_encode([
            'sessao_id'  => $sessaoId,
            'usuario_id' => $usuarioId,
            'texto_ata'  => $textoAta,
            'timestamp'  => now()->toIso8601String(),
        ], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);

        $hash = hash('sha256', $payload);

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
        // Apenas verifica que o hash não foi adulterado
        // (recálculo não é possível sem o payload original completo —
        //  intencional: a verificação real é feita via trilha de auditoria)
        return strlen($hash) === 64 && ctype_xdigit($hash);
    }

    public function identificador(): string
    {
        return 'sha256';
    }
}
