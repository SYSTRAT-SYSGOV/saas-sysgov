<?php

declare(strict_types=1);

namespace Modules\Contracts\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Modules\Contracts\Models\SupportTicket;
use Modules\Contracts\Models\TicketMessage;
use Throwable;

final readonly class SupportTicketService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox
    ) {}

    private function resolveTenantId(): ?int
    {
        try {
            return app(TenantContext::class)->id();
        } catch (Throwable) {
            return null;
        }
    }

    public function openTicket(array $data, int $userId): SupportTicket
    {
        $tenantId = $this->resolveTenantId();
        $year = date('Y');
        $countQuery = SupportTicket::query()->whereYear('created_at', $year);
        if ($tenantId !== null) {
            $countQuery->where('tenant_id', $tenantId);
        }
        $count = $countQuery->count() + 1;
        $ticketNumber = sprintf('TICK-%s-%04d', $year, $count);

        // SLA por prioridade: crítica (4h), alta (12h), media (24h), baixa (48h)
        $slaHours = match ($data['priority'] ?? 'media') {
            'critica' => 4,
            'alta' => 12,
            'media' => 24,
            'baixa' => 48,
            default => 24,
        };

        $ticket = SupportTicket::create([
            'requester_id' => $userId,
            'ticket_number' => $ticketNumber,
            'title' => $data['title'],
            'category' => $data['category'] ?? 'suporte_tecnico',
            'priority' => $data['priority'] ?? 'media',
            'status' => 'aberto',
            'sla_due_at' => now()->addHours($slaHours),
        ]);

        if (!empty($data['initial_message'])) {
            $ticket->messages()->create([
                'user_id' => $userId,
                'message' => $data['initial_message'],
                'attachments' => $data['attachments'] ?? null,
            ]);
        }

        $this->audit->record('support', 'ticket.opened', "Ticket #{$ticketNumber}", null, $ticket->toArray());
        $this->outbox->publish('support.TicketOpened', [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
            'title' => $ticket->title,
            'priority' => $ticket->priority,
        ]);

        return $ticket;
    }

    public function addMessage(SupportTicket $ticket, int $userId, string $message, bool $isInternal = false, ?array $attachments = null): TicketMessage
    {
        $ticketMessage = $ticket->messages()->create([
            'user_id' => $userId,
            'message' => $message,
            'is_internal_note' => $isInternal,
            'attachments' => $attachments,
        ]);

        if (!$isInternal && $ticket->status === 'aguardando_cliente') {
            $ticket->update(['status' => 'em_analise']);
        }

        $this->outbox->publish('support.TicketMessageAdded', [
            'ticket_id' => $ticket->id,
            'message_id' => $ticketMessage->id,
            'is_internal' => $isInternal,
        ]);

        return $ticketMessage;
    }

    public function resolveTicket(SupportTicket $ticket): SupportTicket
    {
        $ticket->update([
            'status' => 'resolvido',
            'resolved_at' => now(),
        ]);

        $this->audit->record('support', 'ticket.resolved', "Ticket #{$ticket->ticket_number} resolvido", null, $ticket->toArray());
        $this->outbox->publish('support.TicketResolved', [
            'ticket_id' => $ticket->id,
            'ticket_number' => $ticket->ticket_number,
        ]);

        return $ticket;
    }
}
