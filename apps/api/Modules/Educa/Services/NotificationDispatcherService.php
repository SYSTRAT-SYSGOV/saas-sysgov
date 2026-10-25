<?php

declare(strict_types=1);

namespace Modules\Educa\Services;

use App\Models\OutboxEvent;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Modules\Educa\Models\EducaEnrollment;
use Modules\Educa\Models\EducaStudentGuardian;

/**
 * Motor de Disparo Transacional de Notificações e Alertas Escolares via Outbox Pattern.
 */
final class NotificationDispatcherService
{
    public function __construct(
        private readonly OutboxPublisher $outbox,
        private readonly AuditLogger $audit,
    ) {}

    /**
     * Enfileira alerta de faltas reiteradas/infrequência escolar no Outbox para os responsáveis.
     */
    public function notificarInfrequencia(string $enrollmentId, int $totalFaltas, string $canal = 'todos'): OutboxEvent
    {
        $matricula = EducaEnrollment::with(['aluno', 'escola.orgUnit'])->findOrFail($enrollmentId);

        // Busca os guardiões cadastrados no MDM
        $responsaveis = EducaStudentGuardian::query()
            ->where('aluno_pessoa_id', $matricula->aluno_pessoa_id)
            ->where('is_responsavel_pedagogico', true)
            ->pluck('responsavel_pessoa_id')
            ->all();

        $payload = [
            'tenant_id' => $matricula->tenant_id,
            'enrollment_id' => $matricula->id,
            'aluno_pessoa_id' => $matricula->aluno_pessoa_id,
            'aluno_nome' => $matricula->aluno?->nome,
            'escola_nome' => $matricula->escola?->nome,
            'total_faltas' => $totalFaltas,
            'canal' => $canal,
            'responsaveis_ids' => $responsaveis,
        ];

        $event = $this->outbox->publish('educa.comunicacao.alerta_infrequencia', $payload, $matricula->tenant_id);

        $this->audit->record('educa', 'notification.absence_alert_queued', "OutboxEvent #{$event->event_id}", null, $payload);

        return $event;
    }
}
