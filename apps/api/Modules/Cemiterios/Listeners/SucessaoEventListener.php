<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Listeners;

use App\Events\OutboxMessage;
use App\Support\OutboxPublisher;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Mail;
use Modules\Cemiterios\Models\User;

/**
 * Listener para eventos da Outbox do módulo Sucessão Hereditária.
 *
 * Eventos:
 * - SucessaoTransicionada: transição de estado do processo
 * - SucessaoConcluida: processo concluído com transferência de concessão
 * - PrazoRegularizacaoProximo: prazo de regularização próximo do vencimento
 * - PrazoRegularizacaoVencido: prazo de regularização vencido
 * - SucessaoDocumentoIntegrityFailed: falha na verificação de integridade do documento
 */
final class SucessaoEventListener
{
    public function handle(OutboxMessage $mensagem): void
    {
        match ($mensagem->event->event_type) {
            'SucessaoTransicionada' => $this->handleTransicao($mensagem->event->payload),
            'SucessaoConcluida' => $this->handleConcluida($mensagem->event->payload),
            'PrazoRegularizacaoProximo' => $this->handlePrazoProximo($mensagem->event->payload),
            'PrazoRegularizacaoVencido' => $this->handlePrazoVencido($mensagem->event->payload),
            'SucessaoDocumentoIntegrityFailed' => $this->handleIntegrityFailed($mensagem->event->payload),
            default => null,
        };
    }

    private function handleTransicao(array $payload): void
    {
        // Notificar gestores sobre transição importante
        if (in_array($payload['para_estado'] ?? '', ['validada', 'sucedida', 'indeferida', 'arquivada'], true)) {
            $this->notificarGestores(
                assunto: "Sucessão {$payload['sucessao_id']} - {$payload['para_estado']}",
                texto: "O processo de sucessão {$payload['sucessao_id']} transitou para {$payload['para_estado']}."
            );
        }
    }

    private function handleConcluida(array $payload): void
    {
        // Notificar sobre conclusão da sucessão
        $this->notificarGestores(
            assunto: "Sucessão {$payload['sucessao_id']} concluída",
            texto: "A sucessão hereditária {$payload['sucessao_id']} foi concluída. Novo titular: {$payload['novo_titular_id']}."
        );

        // TODO: Integrar com portal do concessionário quando implementado
        // OutboxPublisher::dispatch('PortalConcessionarioNotificar', [...]);
    }

    private function handlePrazoProximo(array $payload): void
    {
        $this->notificarGestores(
            assunto: "Prazo de regularização próximo - Sucessão {$payload['sucessao_id']}",
            texto: "O prazo de regularização da sucessão {$payload['sucessao_id']} vence em {$payload['dias_restantes']} dias."
        );
    }

    private function handlePrazoVencido(array $payload): void
    {
        $this->notificarGestores(
            assunto: "URGENTE: Prazo de regularização vencido - Sucessão {$payload['sucessao_id']}",
            texto: "O prazo de regularização da sucessão {$payload['sucessao_id']} está vencido há {$payload['dias_atraso']} dias. Ação imediata necessária."
        );
    }

    private function handleIntegrityFailed(array $payload): void
    {
        $this->notificarGestores(
            assunto: "ALERTA: Integridade de documento comprometida - Sucessão {$payload['sucessao_id']}",
            texto: "O documento {$payload['documento_id']} da sucessão {$payload['sucessao_id']} falhou na verificação de integridade (hash SHA-256)."
        );
    }

    private function notificarGestores(string $assunto, string $texto): void
    {
        // Busca usuários com permissão de gestão de cemitérios
        $gestores = User::whereHas('permissions', function ($q) {
            $q->where('name', 'cemiterios.gestao.manage');
        })->get();

        foreach ($gestores as $gestor) {
            OutboxPublisher::dispatch(EnviarEmail::TIPO, [
                'para' => $gestor->email,
                'assunto' => "[SIGCM] {$assunto}",
                'texto' => $texto . "\n\nAcesse o sistema para mais detalhes.",
            ]);
        }
    }
}