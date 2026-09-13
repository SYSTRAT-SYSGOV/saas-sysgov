<?php

namespace Modules\Capd\Contracts;

/** Resultado da operação de assinatura digital. */
final readonly class AssinaturaResultado
{
    public function __construct(
        /** Hash SHA-256 do conteúdo assinado */
        public string  $hash,
        /** 'sha256_interno' | 'icp_brasil' */
        public string  $tipo,
        /** URL do documento assinado (PSC externo) ou null (interno) */
        public ?string $urlDocumentoAssinado,
        /** Certificado do signatário (ICP-Brasil) ou null */
        public ?string $certificadoSerial,
        /** Timestamp da assinatura */
        public string  $assinadoEm,
    ) {}
}

/**
 * Interface para assinatura digital de atas de sessão.
 *
 * Implementações:
 *   - Sha256AssinaturaAdapter  : Hash interno SHA-256 (gratuito, padrão)
 *   - IcpBrasilAdapter         : Integração com PSC ICP-Brasil pago
 *                                (Certisign, BirdID, Soluti, ClickSign…)
 *
 * Seleção: capd_ciclos.tipo_assinatura_ata = 'sha256' | 'icp_brasil'
 */
interface AssinaturaDigitalInterface
{
    /**
     * Assina o texto da ata.
     *
     * @param  string  $textoAta       Texto consolidado da ata
     * @param  int     $sessaoId       ID da sessão para log de auditoria
     * @param  int     $usuarioId      Usuário que aciona a assinatura
     * @param  array   $contexto       Dados adicionais (ICP-Brasil: CPF, cert)
     */
    public function assinar(
        string $textoAta,
        int    $sessaoId,
        int    $usuarioId,
        array  $contexto = [],
    ): AssinaturaResultado;

    /** Verifica se a assinatura de uma ata ainda é válida. */
    public function verificar(string $textoAta, string $hash): bool;

    /** Identificador do adapter: 'sha256' | 'icp_brasil' */
    public function identificador(): string;
}
