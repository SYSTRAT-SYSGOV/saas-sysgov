<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Services\RhIntegrationService;
use Tests\TestCase;

final class OutboxWebhookHomologacaoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Prefeitura Teste Outbox',
            'slug'   => 'pref-outbox',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_dispatch_webhook_homologacao_publica_no_outbox_sem_chamada_sincrona(): void
    {
        $integracao = RhIntegracao::create([
            'driver'         => 'ipm',
            'nome'           => 'Integração ERP IPM',
            'webhook_url'    => 'https://erp.mock.gov.br/api/capd-webhook',
            'webhook_secret' => 'chave-secreta-hmac',
            'is_active'      => true,
        ]);

        $ciclo = CicloAvaliacao::create([
            'ano_competencia' => 2026,
            'nome'            => 'Ciclo 2026',
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
        ]);

        $user = User::create(['name' => 'Servidor Teste', 'email' => 'srv@teste.gov.br', 'password' => bcrypt('password')]);
        $avaliador = User::create(['name' => 'Avaliador Teste', 'email' => 'av@teste.gov.br', 'password' => bcrypt('password')]);

        $avaliacao = Avaliacao::create([
            'ciclo_id'            => $ciclo->id,
            'servidor_id'         => $user->id,
            'avaliador_id'        => $avaliador->id,
            'respostas_fatores'   => [],
            'nota_final'          => '8.75',
            'elegivel_progressao' => true,
            'data_conclusao'      => now(),
            'homologada'          => true,
            'homologada_em'       => now(),
        ]);

        $rhService = app(RhIntegrationService::class);

        // Despacha webhook de homologação
        $rhService->dispatchWebhookHomologacao($avaliacao);

        // Verifica se o evento foi gravado na tabela outbox_events do tenant
        $mensagemOutbox = \App\Models\OutboxEvent::query()
            ->where('event_type', 'capd.webhook_homologacao')
            ->where('tenant_id', $this->tenant->id)
            ->first();

        self::assertNotNull($mensagemOutbox, 'Evento capd.webhook_homologacao deve ser persistido na tabela outbox_events.');

        $payload = $mensagemOutbox->payload;
        self::assertSame('https://erp.mock.gov.br/api/capd-webhook', $payload['webhook_url']);
        self::assertSame($avaliacao->id, $payload['payload']['avaliacao_id']);
        self::assertSame('8.75', $payload['payload']['nota_final']);
    }
}
