<?php

declare(strict_types=1);

namespace App\Notificacoes;

use Illuminate\Mail\Mailable;

/**
 * Um e-mail a enviar, devolvido por um Tratador (design D1/D2). `destinatario` nulo representa
 * "sem e-mail cadastrado" — o ouvinte grava a linha como `ignorado` e não tenta enviar.
 */
final readonly class Mensagem
{
    public function __construct(
        public string $tipo,
        public ?string $destinatario,
        public Mailable $mailable,
    ) {}
}
