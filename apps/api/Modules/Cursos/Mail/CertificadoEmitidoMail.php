<?php

declare(strict_types=1);

namespace Modules\Cursos\Mail;

use App\Notificacoes\Identidade;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

final class CertificadoEmitidoMail extends Mailable
{
    public function __construct(
        public readonly Identidade $identidade,
        public readonly string $nome,
        public readonly string $curso,
        public readonly string $codigo,
        public readonly string $link,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Certificado emitido');
    }

    public function content(): Content
    {
        return new Content(view: 'cursos::emails.certificado-emitido');
    }
}
