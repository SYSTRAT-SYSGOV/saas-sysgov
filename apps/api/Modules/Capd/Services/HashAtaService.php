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
    ) {}

    /**
     * Gera o hash SHA-256 da ata, sela a sessão e persiste o texto oficial.
     *
     * @throws \DomainException Se a sessão já estiver finalizada ou sem quórum
     */
    public function selarAta(Sessao $sessao, string $textoAta): string
    {
        if ($sessao->finalizada) {
            throw new \DomainException('Esta sessão já foi finalizada e sua ata está selada imutavelmente.');
        }

        if (! $sessao->temQuorum()) {
            throw new \DomainException(
                "Quórum insuficiente para lavrar a ata. Presentes: {$sessao->quorum_presente}, Mínimo: {$sessao->quorum_minimo}."
            );
        }

        $hashSha256 = hash('sha256', $textoAta);

        $sessao->update([
            'ata_texto'       => $textoAta,
            'hash_ata_sha256' => $hashSha256,
            'finalizada'      => true,
            'finalizada_em'   => now(),
        ]);

        $this->audit->record(
            'capd',
            'sessao.ata_selada',
            "Sessão #{$sessao->id} — Ata selada com SHA-256 ({$hashSha256})",
            null,
            [
                'sessao_id'   => $sessao->id,
                'hash_sha256' => $hashSha256,
                'quorum'      => $sessao->quorum_presente,
                'data_sessao' => $sessao->data_sessao->toIso8601String(),
            ],
        );

        return $hashSha256;
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
