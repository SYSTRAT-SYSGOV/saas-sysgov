<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

final class CpfUnicidadeEBuscaTest extends PessoasTestCase
{
    private Tenant $tenantA;
    private Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = $this->criarTenant('tenant-a');
        $this->tenantB = $this->criarTenant('tenant-b');
    }

    public function test_mesmo_cpf_pode_existir_em_tenants_diferentes(): void
    {
        $cpf = $this->cpfValido();

        $this->noTenant($this->tenantA);
        $pessoaA = Pessoa::create(['nome' => 'Pessoa A', 'cpf' => $cpf]);

        $this->noTenant($this->tenantB);
        $pessoaB = Pessoa::create(['nome' => 'Pessoa B', 'cpf' => $cpf]);

        self::assertSame($pessoaA->cpf_hash, $pessoaB->cpf_hash);
        self::assertNotSame($pessoaA->id, $pessoaB->id);
    }

    public function test_rejeita_cadastro_de_cpf_duplicado_no_mesmo_tenant_com_422(): void
    {
        $cpf = $this->cpfValido();
        $this->noTenant($this->tenantA);
        Pessoa::create(['nome' => 'Titular Existente', 'cpf' => $cpf]);

        $cpfComMascara = substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);

        $resposta = $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'nome' => 'Novo Cadastro com Mesmo CPF',
                'cpf' => $cpfComMascara,
            ]);

        $resposta->assertStatus(422)
            ->assertJsonValidationErrors(['cpf']);
    }

    public function test_busca_normalizada_por_cpf_com_e_sem_mascara_via_api(): void
    {
        $cpf = $this->cpfValido();
        $this->noTenant($this->tenantA);
        $pessoa = Pessoa::create(['nome' => 'Carlos Pereira', 'cpf' => $cpf]);

        $admin = $this->como($this->admin($this->tenantA), $this->tenantA);

        // Busca com pontuação completa
        $cpfMascarado = substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
        $resp1 = $admin->getJson("/api/pessoas?q={$cpfMascarado}")->assertOk();
        self::assertSame(1, $resp1->json('total'));
        self::assertSame($pessoa->id, $resp1->json('data.0.id'));

        // Busca somente com dígitos limpos
        $resp2 = $admin->getJson("/api/pessoas?q={$cpf}")->assertOk();
        self::assertSame(1, $resp2->json('total'));
        self::assertSame($pessoa->id, $resp2->json('data.0.id'));

        // Busca parcial por nome
        $resp3 = $admin->getJson('/api/pessoas?q=Carlos')->assertOk();
        self::assertSame(1, $resp3->json('total'));
        self::assertSame($pessoa->id, $resp3->json('data.0.id'));
    }
}
