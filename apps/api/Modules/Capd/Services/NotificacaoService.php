<?php

declare(strict_types=1);

namespace Modules\Capd\Services;

use App\Support\AuditLogger;
use App\Support\TenantContext;
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
