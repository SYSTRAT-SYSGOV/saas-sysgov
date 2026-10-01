<?php

declare(strict_types=1);

namespace Modules\Cursos\Mail;

use App\Notificacoes\Identidade;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * E-mails de mudança de status da inscrição (tarefa 5.2, design D12) — criada, aprovada,
 * recusada, cancelada e promovida da lista de espera compartilham a mesma casca (saudação +
 * parágrafos informativos), só o texto muda por tratador. Nenhum desses precisa de link: quem
 * quiser ver detalhes entra normalmente no painel.
 */
final class InscricaoStatusMail extends Mailable
{
    /** @param list<string> $paragrafos */
    public function __construct(
        public readonly Identidade $identidade,
        public readonly string $assunto,
        public readonly array $paragrafos,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->assunto);
    }

    public function content(): Content
    {
        return new Content(view: 'cursos::emails.inscricao-status');
    }
}
