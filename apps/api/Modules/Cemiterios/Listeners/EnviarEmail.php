<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Listeners;

use App\Events\OutboxMessage;
use App\Support\OutboxPublisher;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;

/**
 * E-mails do módulo saem pela Outbox (outbox:process), nunca no ciclo da
 * requisição (D9). Payload mínimo: destinatário, assunto e texto.
 */
final class EnviarEmail
{
    public const TIPO = 'cemiterios.email';

    public static function agendar(string $para, string $assunto, string $texto): void
    {
        OutboxPublisher::dispatch(self::TIPO, ['para' => $para, 'assunto' => $assunto, 'texto' => $texto]);
    }

    public function handle(OutboxMessage $mensagem): void
    {
        if ($mensagem->event->event_type !== self::TIPO) {
            return;
        }

        $p = $mensagem->event->payload;
        Mail::raw($p['texto'], fn (Message $m) => $m->to($p['para'])->subject($p['assunto']));
    }
}
