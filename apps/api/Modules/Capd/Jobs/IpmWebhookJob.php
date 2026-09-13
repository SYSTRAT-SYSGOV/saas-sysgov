<?php

declare(strict_types=1);

namespace Modules\Capd\Jobs;

use App\Support\AuditLogger;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Modules\Capd\Models\CicloAvaliacao;

/**
 * Job assíncrono consumido pelo Outbox Worker para integrar notas homologadas ao sistema IPM/Folha.
 */
final class IpmWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;
    public int $backoff = 60;

    public function __construct(
        public readonly int   $cicloId,
        public readonly int   $tenantId,
        public readonly array $payload,
    ) {}

    public function handle(AuditLogger $audit): void
    {
        $ciclo = CicloAvaliacao::findOrFail($this->cicloId);

        // Se houver URL de webhook configurada no metadata do ciclo ou tenant
        $webhookUrl = $ciclo->metadata['ipm_webhook_url'] ?? config('services.ipm.webhook_url');

        if (! empty($webhookUrl)) {
            $response = Http::timeout(15)
                ->withHeaders([
                    'X-Sysgov-Tenant'    => (string) $this->tenantId,
                    'X-Sysgov-Signature' => hash_hmac('sha256', json_encode($this->payload), config('app.key')),
                ])
                ->post($webhookUrl, $this->payload);

            if ($response->failed()) {
                throw new \RuntimeException("Falha na sincronização IPM Webhook: HTTP {$response->status()}");
            }
        }

        $audit->record(
            'capd',
            'integracao.ipm_sincronizado',
            "Ciclo #{$this->cicloId} sincronizado com IPM Folha de Pagamento",
            null,
            ['ciclo_id' => $this->cicloId, 'webhook_url' => $webhookUrl ?? 'local_mock'],
        );
    }
}
