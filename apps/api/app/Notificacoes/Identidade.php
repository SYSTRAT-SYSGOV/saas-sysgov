<?php

declare(strict_types=1);

namespace App\Notificacoes;

/**
 * Identidade visual de um órgão para as mensagens de e-mail (design D4): título, cor primária,
 * logotipo e se a assinatura do provedor (SYSTRAT/SYSGOV) fica oculta no rodapé.
 */
final readonly class Identidade
{
    public function __construct(
        public string $titulo,
        public ?string $corPrimaria,
        public ?string $logoUrl,
        public bool $assinaturaOculta,
    ) {}

    /** Sem órgão (evento de plataforma) — identidade padrão do SYSGOV. */
    public static function padrao(): self
    {
        return new self('SYSGOV', null, null, false);
    }
}
