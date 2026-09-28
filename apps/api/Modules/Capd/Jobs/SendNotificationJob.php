<?php

declare(strict_types=1);

namespace Modules\Capd\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Modules\Capd\Services\NotificacaoService;

final class SendNotificationJob implements ShouldQueue
{
    use Queueable;

    /**
     * @param array<string, mixed> $metadata
     */
    public function __construct(
        private readonly string $userId,
        private readonly string $message,
        private readonly array $metadata = [],
    ) {}

    public function handle(NotificacaoService $notificacoes): void
    {
        try {
            $notificacoes->enviar($this->userId, $this->message, $this->metadata);
            Log::info("CAPD: Notificação enviada com sucesso para o usuário {$this->userId}");
        } catch (\Exception $e) {
            Log::error("CAPD: Falha ao enviar notificação para o usuário {$this->userId}: {$e->getMessage()}");
            throw $e;
        }
    }
}
