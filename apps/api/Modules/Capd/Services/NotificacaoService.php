<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Notificacao;

/**
 * Serviço de Notificações Eletrônicas da CAPD (In-App e E-mail).
 *
 * Dispara alertas com prazo legal, notificações de recursos,
 * avisos de ciência pendente e lembretes periódicos de CIT.
 */
final class NotificacaoService
{
    public function __construct(
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Interface genérica de envio de notificação (estendida para Jobs).
     *
     * @param array<string, mixed> $metadata
     */
    public function enviar(string $userId, string $message, array $metadata = []): void
    {
        // Integração com o sistema de Notificações do Núcleo ou Provider Externo (SES/SendGrid)
        // Por ora, persiste como notificação in-app e gera log de auditoria.
        $this->notificar(
            destinatarioId: (int) $userId,
            tipo: 'alerta_sistema',
            titulo: 'Notificação do Sistema CAPD',
            corpo: $message,
            contexto: $metadata
        );
    }

    /**
     * Notifica a abertura de um novo ciclo para todos os envolvidos.
     */
    public function notificarAberturaCiclo(CicloAvaliacao $ciclo): void
    {
        // Busca todos os servidores elegíveis para este ciclo
        // Em produção: $servidores = $this->servidorService->listarElegiveis($ciclo);

        // Mock para demonstração: notifica os 5 primeiros servidores
        $servidores = \Modules\Capd\Models\Servidor::limit(5)->get();

        foreach ($servidores as $servidor) {
            // Enfileira o Job para cada servidor para garantir performance
            \Modules\Capd\Jobs\SendNotificationJob::dispatch(
                userId: (string)$servidor->id,
                message: "Olá {$servidor->nome_completo}, o Ciclo Avaliativo {$ciclo->nome} foi aberto. Prazo limite: {$ciclo->data_fim->format('d/m/Y')}.",
                metadata: ['ciclo_id' => $ciclo->id, 'acao' => 'abrir_avaliacao']
            );
        }
    }

    /**
     * Cria e enfileira uma notificação para um usuário.
     *
     * @param  array<string, mixed>|null  $contexto
     */
    public function notificar(
        int $destinatarioId,
        string $tipo,
        string $titulo,
        string $corpo,
        string $canal = Notificacao::CANAL_IN_APP,
        ?array $contexto = null,
    ): Notificacao {
        $tenantId = (int) app(TenantContext::class)->id();

        $notificacao = Notificacao::create([
            'tenant_id'       => $tenantId,
            'destinatario_id' => $destinatarioId,
            'canal'           => $canal,
            'tipo'            => $tipo,
            'titulo'          => $titulo,
            'corpo'           => $corpo,
            'contexto'        => $contexto,
            'lida'            => false,
            'enviada'         => true,
            'enviada_em'      => now(),
        ]);

        $this->audit->record(
            'capd',
            'notificacao.disparada',
            "Notificação ({$tipo}) enviada para Usuário #{$destinatarioId}",
            null,
            ['id' => $notificacao->id, 'tipo' => $tipo, 'canal' => $canal],
        );

        return $notificacao;
    }

    /**
     * Marca notificação como lida pelo destinatário.
     */
    public function marcarComoLida(int $notificacaoId, int $userId): void
    {
        $notificacao = Notificacao::where('id', $notificacaoId)
            ->where('destinatario_id', $userId)
            ->firstOrFail();

        $notificacao->update([
            'lida'    => true,
            'lida_em' => now(),
        ]);
    }
}
