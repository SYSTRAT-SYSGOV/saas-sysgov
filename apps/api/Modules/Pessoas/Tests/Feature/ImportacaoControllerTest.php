<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Tests\PessoasTestCase;

final class ImportacaoControllerTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_endpoint_agenda_importacao_e_outbox_process_importa_a_pessoa(): void
    {
        Http::fake(['prefeitura.example/*' => Http::response(['nome' => 'Pessoa Importada'])]);
        PessoaIntegracao::create(['nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $cpf = $this->cpfValido();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/pessoas/importacoes', ['documento' => $cpf])
            ->assertStatus(202);

        $this->artisan('outbox:process')->assertSuccessful();

        self::assertSame(1, Pessoa::count());
    }

    public function test_endpoint_exige_permissao_de_importacao(): void
    {
        $usuario = $this->usuario($this->tenant);

        $this->como($usuario, $this->tenant)
            ->postJson('/api/pessoas/importacoes', ['documento' => $this->cpfValido()])
            ->assertForbidden();
    }
}
