<?php

declare(strict_types=1);

namespace Modules\Cursos\Mail;

use App\Notificacoes\Identidade;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class CadastroExternoVerificacaoMail extends Mailable
{
    public function __construct(
        public readonly Identidade $identidade,
        public readonly string $nome,
        public readonly string $link,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Confirme seu e-mail');
    }

    public function content(): Content
    {
        return new Content(view: 'cursos::emails.cadastro-externo-verificacao');
    }
}
