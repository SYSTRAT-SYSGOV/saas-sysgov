<?php

declare(strict_types=1);

namespace App\Mail;

use App\Notificacoes\Identidade;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class PasswordResetMail extends Mailable
{
    public function __construct(
        public readonly Identidade $identidade,
        public readonly string $nome,
        public readonly string $link,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Redefinição de senha');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.password-reset');
    }
}
