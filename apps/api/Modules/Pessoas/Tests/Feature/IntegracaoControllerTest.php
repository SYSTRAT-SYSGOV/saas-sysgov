<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\AuditLog;
use App\Models\Tenant;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Tests\PessoasTestCase;

final class IntegracaoControllerTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_admin_cadastra_nova_integracao(): void
    {
        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/pessoas/integracoes', [
                'nome' => 'Cadastro Único', 'api_url' => 'https://prefeitura.example/api', 'api_token' => 'segredo-123',
            ]);

        $resposta->assertCreated();
        self::assertSame(1, PessoaIntegracao::count());
        self::assertArrayNotHasKey('api_token', $resposta->json());
        self::assertSame(1, AuditLog::where('action', 'integracao.criada')->count());
    }

    public function test_admin_desativa_integracao_sem_afetar_historico(): void
    {
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $admin = $this->como($this->admin($this->tenant), $this->tenant);

        $admin->putJson("/api/pessoas/integracoes/{$integracao->id}", ['is_active' => false])->assertOk();

        self::assertFalse($integracao->refresh()->is_active);
    }

    public function test_gestao_de_integracoes_sem_permissao_e_rejeitada(): void
    {
        $usuario = $this->usuario($this->tenant);

        $this->como($usuario, $this->tenant)
            ->postJson('/api/pessoas/integracoes', ['nome' => 'X', 'api_url' => 'https://prefeitura.example/api'])
            ->assertForbidden();

        self::assertSame(0, PessoaIntegracao::count());
    }
}
