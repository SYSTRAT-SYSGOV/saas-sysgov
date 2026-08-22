<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Events\OutboxMessage;
use App\Models\OutboxEvent;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Throwable;

final class ProcessOutbox extends Command
{
    protected $signature = 'outbox:process {--limit=50 : Quantidade máxima por execução}';
    protected $description = 'Processa eventos pendentes da Outbox com retry controlado';

    public function handle(): int
    {
        $processed = 0;
        $limit = max(1, min((int) $this->option('limit'), 500));
        for ($index = 0; $index < $limit; $index++) {
            $event = DB::transaction(function (): ?OutboxEvent {
                $event = OutboxEvent::query()->where('status', 'pending')->where('available_at', '<=', now())->orderBy('available_at')->lockForUpdate()->first();
                if (!$event) return null;
                $event->update(['status' => 'processing', 'attempts' => $event->attempts + 1]);
                return $event->fresh();
            });
            if (!$event) break;
            try {
                event(new OutboxMessage($event));
                $event->update(['status' => 'done', 'processed_at' => now(), 'error' => null]);
                $processed++;
            } catch (Throwable $exception) {
                $event->update(['status' => $event->attempts >= 5 ? 'failed' : 'pending', 'available_at' => now()->addMinutes(min($event->attempts * 5, 60)), 'error' => $exception->getMessage()]);
                $this->error('Falha no evento '.$event->event_id.': '.$exception->getMessage());
            }
        }
        $this->info("Eventos processados: {$processed}");
        return self::SUCCESS;
    }
}
