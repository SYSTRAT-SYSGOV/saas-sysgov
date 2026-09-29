<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Events\OutboxMessage;
use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Notificacoes\Mensagem;
use App\Support\TenantContext;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Ouvinte único do Outbox que envia e-mail (design D1/D2). Sem tratador registrado para o
 * `event_type`, ignora (o evento termina `done`, como antes desta mudança existir). Cada
 * mensagem é enviada com idempotência própria (notificacoes_envios): uma nova tentativa do
 * mesmo evento nunca reenvia quem já recebeu.
 */
final class EnviarNotificacoes
{
    public function handle(OutboxMessage $event): void
    {
        $evento = $event->event;
        /** @var list<class-string<\App\Notificacoes\Tratador>> $tratadores */
        $tratadores = config("notificacoes.{$evento->event_type}", []);
        if ($tratadores === []) {
            return;
        }

        $tenantContext = app(TenantContext::class);
        $definiuTenant = false;
        if ($evento->tenant_id !== null) {
            $tenant = Tenant::find($evento->tenant_id);
            if ($tenant !== null) {
                $tenantContext->set($tenant);
                $definiuTenant = true;
            }
        }

        try {
            /** @var list<Throwable> $falhas */
            $falhas = [];
            foreach ($tratadores as $tratadorClasse) {
                $tratador = app($tratadorClasse);
                foreach ($tratador->tratar($evento) as $mensagem) {
                    try {
                        $this->processarMensagem($evento, $mensagem);
                    } catch (Throwable $exception) {
                        $falhas[] = $exception;
                    }
                }
            }
            // Falha parcial (design D2, cenário "Falha parcial em vários destinatários"): todas
            // as mensagens são tentadas antes de relançar, pra quem já foi enviado não ser
            // reenviado numa nova tentativa do evento — só quem falhou continua pendente/falhou.
            if ($falhas !== []) {
                throw $falhas[0];
            }
        } finally {
            if ($definiuTenant) {
                $tenantContext->clear();
            }
        }
    }

    private function processarMensagem(OutboxEvent $evento, Mensagem $mensagem): void
    {
        if ($mensagem->destinatario === null) {
            NotificacaoEnvio::create([
                'tenant_id' => $evento->tenant_id,
                'event_id' => $evento->event_id,
                'tipo' => $mensagem->tipo,
                'destinatario' => null,
                'situacao' => 'ignorado',
            ]);
            return;
        }

        $envio = NotificacaoEnvio::query()->firstOrCreate(
            ['event_id' => $evento->event_id, 'tipo' => $mensagem->tipo, 'destinatario' => $mensagem->destinatario],
            ['tenant_id' => $evento->tenant_id, 'situacao' => 'pendente'],
        );

        if ($envio->situacao === 'enviado') {
            $mensagem->aposEnvio?->__invoke();
            return;
        }

        $envio->increment('tentativas');

        try {
            Mail::to($mensagem->destinatario)->send($mensagem->mailable);
            $envio->update(['situacao' => 'enviado', 'enviado_em' => now(), 'erro' => null]);
            $mensagem->aposEnvio?->__invoke();
        } catch (Throwable $exception) {
            $envio->update(['situacao' => 'falhou', 'erro' => $exception->getMessage()]);
            throw $exception;
        }
    }
}
