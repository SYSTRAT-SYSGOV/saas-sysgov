<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Support\OutboxPublisher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * notificacoes_envios (tarefa 1.3, design D2): registro de cada e-mail enviado ou tentado pelo
 * ouvinte do Outbox — não usa TenantAware (mesmo padrão de OutboxEvent), porque tenant_id é
 * nulo-permitido para eventos de plataforma sem órgão.
 */
final class NotificacaoEnvioTest extends TestCase
{
    use RefreshDatabase;

    public function test_isolamento_entre_orgaos(): void
    {
        $tenantA = Tenant::create(['name' => 'Prefeitura A', 'slug' => 'pref-a-envios', 'type' => 'prefeitura', 'status' => 'active']);
        $tenantB = Tenant::create(['name' => 'Prefeitura B', 'slug' => 'pref-b-envios', 'type' => 'prefeitura', 'status' => 'active']);

        $eventoA = app(OutboxPublisher::class)->publish('cursos.teste', ['x' => 1], $tenantA->id);
        $eventoB = app(OutboxPublisher::class)->publish('cursos.teste', ['x' => 2], $tenantB->id);

        NotificacaoEnvio::create(['tenant_id' => $tenantA->id, 'event_id' => $eventoA->event_id, 'tipo' => 'teste', 'destinatario' => 'a@teste.gov.br']);
        NotificacaoEnvio::create(['tenant_id' => $tenantB->id, 'event_id' => $eventoB->event_id, 'tipo' => 'teste', 'destinatario' => 'b@teste.gov.br']);

        $doTenantA = NotificacaoEnvio::query()->where('tenant_id', $tenantA->id)->pluck('destinatario')->all();

        $this->assertSame(['a@teste.gov.br'], $doTenantA);
    }

    public function test_evento_de_plataforma_sem_tenant(): void
    {
        $evento = app(OutboxPublisher::class)->publish('platform.password_reset', ['user_id' => 1]);

        $envio = NotificacaoEnvio::create(['tenant_id' => null, 'event_id' => $evento->event_id, 'tipo' => 'redefinicao_senha', 'destinatario' => 'admin@sysgov.local']);

        $this->assertNull($envio->fresh()->tenant_id);
    }

    public function test_reenvio_do_mesmo_evento_e_destinatario_e_bloqueado_pela_unicidade(): void
    {
        $evento = app(OutboxPublisher::class)->publish('cursos.teste', ['x' => 1]);
        NotificacaoEnvio::create(['event_id' => $evento->event_id, 'tipo' => 'teste', 'destinatario' => 'a@teste.gov.br', 'situacao' => 'enviado']);

        $this->expectException(\Illuminate\Database\QueryException::class);
        NotificacaoEnvio::create(['event_id' => $evento->event_id, 'tipo' => 'teste', 'destinatario' => 'a@teste.gov.br']);
    }
}
