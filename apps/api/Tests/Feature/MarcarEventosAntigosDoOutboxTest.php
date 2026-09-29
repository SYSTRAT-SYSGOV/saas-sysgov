<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\OutboxEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Tarefa 1.7 (design, Migration Plan): eventos com `available_at` anterior à ativação do
 * consumidor viram `done` sem envio, pra ligar o `scheduler` não disparar de uma vez tudo que
 * se acumulou desde as Fases 1 e 2.
 */
final class MarcarEventosAntigosDoOutboxTest extends TestCase
{
    use RefreshDatabase;

    private function rodarMigration(): void
    {
        /** @var \Illuminate\Database\Migrations\Migration $migration */
        $migration = require database_path('migrations/2026_09_29_130000_marcar_eventos_antigos_do_outbox_como_processados.php');
        $migration->up();
    }

    public function test_eventos_antigos_pendentes_viram_done_sem_processar(): void
    {
        $antigo = OutboxEvent::create(['event_type' => 'PasswordResetRequested', 'event_version' => 1, 'payload' => ['user_id' => 1, 'token' => 'velho'], 'status' => 'pending', 'available_at' => now()->subMonths(3)]);

        $this->rodarMigration();

        $antigo->refresh();
        $this->assertSame('done', $antigo->status);
        $this->assertNotNull($antigo->processed_at);
        // O token em claro continua no payload — não passou pelo tratador, só foi marcado done.
        $this->assertSame('velho', $antigo->payload['token']);
    }

    public function test_eventos_futuros_nao_sao_afetados(): void
    {
        $futuro = OutboxEvent::create(['event_type' => 'cursos.teste', 'event_version' => 1, 'payload' => [], 'status' => 'pending', 'available_at' => now()->addHour()]);

        $this->rodarMigration();

        $this->assertSame('pending', $futuro->fresh()->status);
    }

    public function test_eventos_ja_processados_ou_falhos_nao_sao_afetados(): void
    {
        $done = OutboxEvent::create(['event_type' => 'x', 'event_version' => 1, 'payload' => [], 'status' => 'done', 'available_at' => now()->subMonth(), 'processed_at' => now()->subMonth()]);
        $failed = OutboxEvent::create(['event_type' => 'y', 'event_version' => 1, 'payload' => [], 'status' => 'failed', 'available_at' => now()->subMonth(), 'attempts' => 5]);

        $this->rodarMigration();

        $this->assertSame('done', $done->fresh()->status);
        $this->assertSame('failed', $failed->fresh()->status);
    }
}
