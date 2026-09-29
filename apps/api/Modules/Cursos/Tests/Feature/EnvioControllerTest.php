<?php

declare(strict_types=1);

namespace Modules\Cursos\Tests\Feature;

use App\Models\AuditLog;
use App\Models\NotificacaoEnvio;
use App\Models\OutboxEvent;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Cursos\Tests\Concerns\CenarioCursos;
use Modules\Cursos\Tests\TestCase;

/**
 * Tarefa 1.8 — API de envios do órgão (cursos.manage): listar com filtro de situação e reenviar
 * os falhou. `NotificacaoEnvio` não é `TenantAware`, então os cenários "Envios de outro órgão"
 * testam explicitamente que o isolamento por tenant é aplicado no controller, não no model.
 */
final class EnvioControllerTest extends TestCase
{
    use CenarioCursos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_cursos'], 'Admin');
    }

    /** @param array<string, mixed> $atributos */
    private function criarEnvio(?int $tenantId, array $atributos = []): NotificacaoEnvio
    {
        $evento = OutboxEvent::create([
            'event_type' => 'cursos.teste',
            'event_version' => 1,
            'payload' => [],
            'status' => 'failed',
            'available_at' => now(),
            'attempts' => 5,
        ]);

        return NotificacaoEnvio::create([
            'tenant_id' => $tenantId,
            'event_id' => $evento->event_id,
            'tipo' => 'boas_vindas',
            'destinatario' => 'ana@teste.gov.br',
            'situacao' => 'falhou',
            'tentativas' => 5,
            'erro' => 'SMTP indisponível',
            ...$atributos,
        ]);
    }

    public function test_lista_envios_do_proprio_tenant_filtrando_por_situacao(): void
    {
        $this->criarEnvio($this->tenant->id, ['situacao' => 'enviado', 'erro' => null]);
        $falhou = $this->criarEnvio($this->tenant->id);
        $outroTenant = Tenant::create(['name' => 'Outra Prefeitura', 'slug' => 'prefeitura-b', 'type' => 'prefeitura', 'status' => 'active']);
        $this->criarEnvio($outroTenant->id);

        $resposta = $this->como($this->admin, $this->tenant)
            ->getJson('/api/cursos/envios?situacao=falhou')
            ->assertOk()
            ->json();

        $this->assertCount(1, $resposta['data']);
        $this->assertSame($falhou->id, $resposta['data'][0]['id']);
    }

    public function test_reenvio_de_falha_reseta_envio_e_evento_para_pendente(): void
    {
        $envio = $this->criarEnvio($this->tenant->id);

        $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/envios/{$envio->id}/reenviar")
            ->assertOk()
            ->assertJson(['situacao' => 'pendente']);

        $envio->refresh();
        $this->assertSame('pendente', $envio->situacao);
        $this->assertSame('pending', $envio->evento()->first()->status);

        $this->assertTrue(
            AuditLog::query()->where('action', 'notificacao.reenviada')->where('tenant_id', $this->tenant->id)->exists()
        );
    }

    public function test_reenvio_recusado_quando_envio_nao_esta_com_falha(): void
    {
        $envio = $this->criarEnvio($this->tenant->id, ['situacao' => 'enviado', 'erro' => null]);

        $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/envios/{$envio->id}/reenviar")
            ->assertStatus(422);

        $this->assertSame('enviado', $envio->fresh()->situacao);
    }

    public function test_envios_de_outro_orgao_nao_aparecem_na_listagem_nem_podem_ser_reenviados(): void
    {
        $outroTenant = Tenant::create(['name' => 'Outra Prefeitura', 'slug' => 'prefeitura-b', 'type' => 'prefeitura', 'status' => 'active']);
        $envioDeOutroTenant = $this->criarEnvio($outroTenant->id);

        $this->como($this->admin, $this->tenant)
            ->getJson('/api/cursos/envios')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->como($this->admin, $this->tenant)
            ->postJson("/api/cursos/envios/{$envioDeOutroTenant->id}/reenviar")
            ->assertStatus(404);

        $this->assertSame('falhou', $envioDeOutroTenant->fresh()->situacao);
    }
}
