<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class IntegracaoControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
    }

    public function test_chefia_cria_lista_e_revoga_uma_integracao(): void
    {
        $chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.chefia'], 'Chefia');

        $criacao = $this->como($chefia, $this->tenant)->postJson('/api/vistoria/integracoes', ['nome' => 'Sistema Externo X']);
        $criacao->assertStatus(201)->assertJsonStructure(['id', 'nome', 'api_key']);
        self::assertStringStartsWith('vst_', $criacao->json('api_key'));

        $listagem = $this->como($chefia, $this->tenant)->getJson('/api/vistoria/integracoes');
        $listagem->assertStatus(200)->assertJsonCount(1);
        self::assertArrayNotHasKey('api_key', $listagem->json('0'));

        $id = $criacao->json('id');
        $this->como($chefia, $this->tenant)->deleteJson("/api/vistoria/integracoes/{$id}")->assertStatus(200);
    }

    public function test_fiscal_sem_permissao_e_recusado(): void
    {
        $fiscal = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Fiscal');

        $this->como($fiscal, $this->tenant)->postJson('/api/vistoria/integracoes', ['nome' => 'Sistema Externo X'])->assertStatus(403);
        $this->como($fiscal, $this->tenant)->getJson('/api/vistoria/integracoes')->assertStatus(403);
    }
}
