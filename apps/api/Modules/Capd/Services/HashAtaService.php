<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use Modules\Capd\Models\Sessao;

/**
 * Serviço de Geração e Verificação de Integridade Criptográfica de Atas (RN-C06).
 *
 * Utiliza SHA-256 para selar a ata após deliberação da comissão.
 * Qualquer alteração posterior no texto da ata quebra a correspondência do hash.
 */
final class HashAtaService
{
    public function __construct(
        private readonly AuditLogger $audit,
        private readonly \Modules\Capd\Services\Adapters\IcpBrasilAdapter $psc,
    ) {}

    /**
     * Gera o hash SHA-256 da ata, sela a sessão e persiste o texto oficial.
     *
     * @param array<string, mixed> $contexto
     * @throws \DomainException Se a sessão já estiver finalizada ou sem quórum
     */
    public function selarAta(Sessao $sessao, string $textoAta, array $contexto = []): string
    {
        if ($sessao->finalizada) {
            throw new \DomainException('Esta sessão já foi finalizada e sua ata está selada imutavelmente.');
        }

        if (! $sessao->temQuorum()) {
            throw new \DomainException(
                "Quórum insuficiente para lavrar a ata. Presentes: {$sessao->quorum_presente}, Mínimo: {$sessao->quorum_minimo}."
            );
        }

        // Tenta assinar via PSC se configurado, caso contrário usa SHA-256 interno.
        // Nota: comissão sem membro cadastrado é um estado de dados possível em runtime
        // (Eloquent::first() pode devolver null), mesmo quando o PHPStan, com os generics
        // atuais do Larastan, infere a relação como não-nula — por isso o null-check
        // explícito abaixo em vez de `?->`.
        $relator = $sessao->comissao->membros()->first();
        $relatorId = $relator === null ? 0 : $relator->servidor_id;
        $resultado = $this->psc->assinar($textoAta, $sessao->id, $relatorId, $contexto);
        $hash = $resultado->hash;

        $sessao->update([
            'ata_texto'              => $textoAta,
            'hash_ata_sha256'        => $hash,
            'psc_transaction_id'    => $resultado->urlDocumentoAssinado, // Usando URL como ID de transação para simplicidade
            'psc_certificate_serial' => $resultado->certificadoSerial,
            'psc_signed_at'          => $resultado->assinadoEm,
            'finalizada'             => true,
            'finalizada_em'          => now(),
        ]);

        $this->audit->record(
            'capd',
            'sessao.ata_selada',
            "Sessão #{$sessao->id} — Ata selada via {$resultado->tipo} ({$hash})",
            null,
            [
                'sessao_id'   => $sessao->id,
                'hash'         => $hash,
                'tipo'        => $resultado->tipo,
                'quorum'      => $sessao->quorum_presente,
                'data_sessao' => $sessao->data_sessao->toIso8601String(),
            ],
        );

        return $hash;
    }

    /**
     * Verifica a integridade do texto da ata contra o hash registrado no momento do fechamento.
     */
    public function verificarIntegridade(Sessao $sessao): bool
    {
        if (! $sessao->finalizada || empty($sessao->hash_ata_sha256) || empty($sessao->ata_texto)) {
            return false;
        }

        $hashAtual = hash('sha256', $sessao->ata_texto);

        return hash_equals($sessao->hash_ata_sha256, $hashAtual);
    }
}
