<?php

declare(strict_types=1);

namespace Modules\Portfolio\Tests\Feature;

use App\Models\Role;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Portfolio\Database\Seeders\PortfolioRbacSeeder;
use Modules\Portfolio\Tests\Concerns\CenarioPortfolio;
use Modules\Portfolio\Tests\TestCase;

final class EstruturaPortfolioTest extends TestCase
{
    use CenarioPortfolio;
    use RefreshDatabase;

    public function test_module_json_depende_do_escola_e_declara_permissoes(): void
    {
        $json = json_decode((string) file_get_contents(base_path('Modules/Portfolio/module.json')), true);
        $this->assertSame('portfolio', $json['alias']);
        $this->assertContains('Escola', $json['requires']);
        $this->assertSame(['portfolio.view', 'portfolio.professor', 'portfolio.manage'], array_keys($json['permissions']));
    }

    public function test_perfis_clonados_no_tenant_com_permissoes_esperadas(): void
    {
        $tenant = $this->criarTenant();
        (new PortfolioRbacSeeder())->run(); // idempotente

        $professor = Role::where('slug', 'portfolio_professor')->where('tenant_id', $tenant->id)->firstOrFail();
        $gestor = Role::where('slug', 'portfolio_gestor')->where('tenant_id', $tenant->id)->firstOrFail();
        $this->assertEqualsCanonicalizing(['escola.view', 'portfolio.view', 'portfolio.professor'], $professor->permissions()->pluck('slug')->all());
        $this->assertEqualsCanonicalizing(['escola.view', 'portfolio.view', 'portfolio.manage'], $gestor->permissions()->pluck('slug')->all());
    }

    public function test_escola_lista_escolas_para_o_modulo_portfolio(): void
    {
        $tenant = $this->criarTenant();
        $this->turma($tenant); // cria a escola única do tenant

        $this->como($this->usuario($tenant), $tenant)->getJson('/api/escola/escolas/minhas?modulo=portfolio')
            ->assertOk()->assertJsonCount(1, 'escolas');
    }
}
