<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdDadosDemonstracaoSeeder;
use Modules\Capd\Models\Servidor;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

/** O seeder de demonstração do CAPD grava servidores pela pessoa (Fase 5): CPF válido, contatos e nascimento na pessoa, sem duplicar ao repetir. */
final class CapdDadosDemonstracaoSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_semeia_servidores_com_pessoa_e_e_idempotente(): void
    {
        $tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria-pr', 'type' => 'prefeitura', 'status' => 'active']);
        $seeder = new CapdDadosDemonstracaoSeeder();

        ob_start();
        $seeder->seedTenant($tenant->id);
        $servidores = Servidor::withoutGlobalScope('tenant')->count();
        $pessoas = Pessoa::withoutGlobalScopes()->count();
        $seeder->seedTenant($tenant->id);
        ob_end_clean();

        $this->assertGreaterThan(50, $servidores);
        $this->assertSame($servidores, Servidor::withoutGlobalScope('tenant')->count());
        $this->assertSame($pessoas, Pessoa::withoutGlobalScopes()->count());

        $carlos = Servidor::withoutGlobalScope('tenant')->where('matricula', 'SERV-1001')->firstOrFail();
        $this->assertSame('carlos.silveira@araucaria.pr.gov.br', $carlos->emailDaPessoa());
        $this->assertSame('1985-06-15', $carlos->nascimentoDaPessoa()?->toDateString());
        $this->assertSame(11, strlen($carlos->cpfDigitos()));
        $this->assertFalse($carlos->pessoa->documento_pendente);
    }
}
