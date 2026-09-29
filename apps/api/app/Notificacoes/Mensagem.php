<?php

declare(strict_types=1);

namespace App\Notificacoes;

use Closure;
use Illuminate\Mail\Mailable;

/**
 * Um e-mail a enviar, devolvido por um Tratador (design D1/D2). `destinatario` nulo representa
 * "sem e-mail cadastrado" — o ouvinte grava a linha como `ignorado` e não tenta enviar.
 *
 * `aposEnvio`, se dado, roda toda vez que a linha de `notificacoes_envios` fica (ou já estava)
 * `enviado` — recém-enviado ou numa nova tentativa que só confirma o que outra já tinha feito
 * (idempotência). Existe pro tratador de redefinição de senha (D5) apagar o token em claro do
 * Outbox só depois do envio ter dado certo, e rodar de novo se essa limpeza falhar antes.
 */
final readonly class Mensagem
{
    public function __construct(
        public string $tipo,
        public ?string $destinatario,
        public Mailable $mailable,
        public ?Closure $aposEnvio = null,
    ) {}
}
