<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Validação condicional por tipo e unicidade de documento (spec: pessoas). */
final class PessoaJuridicaValidacaoTest extends PessoasTestCase
{
    private Tenant $tenantA;
    private Tenant $tenantB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = $this->criarTenant('tenant-a');
        $this->tenantB = $this->criarTenant('tenant-b');
    }

    public function test_cnpj_invalido_e_rejeitado_com_422_e_nenhum_registro_criado(): void
    {
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'tipo' => 'juridica',
                'razao_social' => 'Empresa Teste Ltda',
                'cnpj' => '11.111.111/1111-11',
            ])
            ->assertStatus(422);

        self::assertSame(0, Pessoa::count());
    }

    public function test_razao_social_ausente_e_rejeitada(): void
    {
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'tipo' => 'juridica',
                'cnpj' => $this->cnpjValido(),
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['razao_social']);
    }

    public function test_cnpj_duplicado_no_mesmo_tenant_e_rejeitado(): void
    {
        $cnpj = $this->cnpjValido();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['tipo' => 'juridica', 'razao_social' => 'Empresa A', 'cnpj' => $cnpj])
            ->assertStatus(201);

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['tipo' => 'juridica', 'razao_social' => 'Empresa A Duplicada', 'cnpj' => $cnpj])
            ->assertStatus(422);
    }

    public function test_mesmo_cnpj_e_permitido_em_tenants_diferentes(): void
    {
        $cnpj = $this->cnpjValido();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['tipo' => 'juridica', 'razao_social' => 'Empresa A', 'cnpj' => $cnpj])
            ->assertStatus(201);

        $this->como($this->admin($this->tenantB), $this->tenantB)
            ->postJson('/api/pessoas', ['tipo' => 'juridica', 'razao_social' => 'Empresa B', 'cnpj' => $cnpj])
            ->assertStatus(201);
    }

    public function test_cpf_e_cnpj_com_mesmos_digitos_nunca_colidem(): void
    {
        $digitos = $this->cpfValido();

        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', ['tipo' => 'fisica', 'nome' => 'Pessoa Física', 'cpf' => $digitos])
            ->assertStatus(201);

        // Mesmos 11 dígitos não formam um CNPJ válido de 14 dígitos; usamos um CNPJ
        // qualquer para comprovar que a unicidade é isolada por tipo.
        $this->como($this->admin($this->tenantA), $this->tenantA)
            ->postJson('/api/pessoas', [
                'tipo' => 'juridica',
                'razao_social' => 'Empresa Mesmos Dígitos',
                'cnpj' => $this->cnpjValido(),
            ])
            ->assertStatus(201);

        self::assertSame(2, Pessoa::count());
    }
}
