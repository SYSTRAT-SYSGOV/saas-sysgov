<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Models\PessoaSyncLog;
use Modules\Pessoas\Tests\PessoasTestCase;

final class SyncLogControllerTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_consulta_historico_de_sincronizacao_com_filtro_por_status(): void
    {
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        PessoaSyncLog::create(['integracao_id' => $integracao->id, 'cpf' => $this->cpfValido(), 'tipo' => 'importacao_pessoa', 'direcao' => 'inbound', 'status' => 'sucesso', 'registros_processados' => 1, 'registros_sucesso' => 1, 'registros_falha' => 0]);
        PessoaSyncLog::create(['integracao_id' => $integracao->id, 'cpf' => $this->cpfValido(), 'tipo' => 'importacao_pessoa', 'direcao' => 'inbound', 'status' => 'erro', 'registros_processados' => 1, 'registros_sucesso' => 0, 'registros_falha' => 1]);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->getJson('/api/pessoas/sync-logs?status=erro')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.status', 'erro');
    }

    public function test_reprocessar_log_com_falha_agenda_nova_tentativa_e_importa_a_pessoa(): void
    {
        Http::fake(['prefeitura.example/*' => Http::response(['nome' => 'Pessoa Importada'])]);
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $cpf = $this->cpfValido();
        $log = PessoaSyncLog::create(['integracao_id' => $integracao->id, 'cpf' => $cpf, 'tipo' => 'importacao_pessoa', 'direcao' => 'inbound', 'status' => 'erro', 'registros_processados' => 1, 'registros_sucesso' => 0, 'registros_falha' => 1]);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/sync-logs/{$log->id}/reprocessar")
            ->assertStatus(202);

        $this->artisan('outbox:process')->assertSuccessful();

        self::assertSame(1, Pessoa::count());
    }

    public function test_reprocessar_nao_duplica_pessoa_ja_existente_com_mesmo_cpf(): void
    {
        Http::fake(['prefeitura.example/*' => Http::response(['nome' => 'Pessoa Atualizada'])]);
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $cpf = $this->cpfValido();
        Pessoa::create(['nome' => 'Pessoa Original', 'cpf' => $cpf]);
        $log = PessoaSyncLog::create(['integracao_id' => $integracao->id, 'cpf' => $cpf, 'tipo' => 'importacao_pessoa', 'direcao' => 'inbound', 'status' => 'erro', 'registros_processados' => 1, 'registros_sucesso' => 0, 'registros_falha' => 1]);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/sync-logs/{$log->id}/reprocessar")
            ->assertStatus(202);

        $this->artisan('outbox:process')->assertSuccessful();

        self::assertSame(1, Pessoa::count());
        self::assertSame('Pessoa Atualizada', Pessoa::first()->nome);
    }

    public function test_reprocessar_sem_permissao_e_rejeitado(): void
    {
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $log = PessoaSyncLog::create(['integracao_id' => $integracao->id, 'cpf' => $this->cpfValido(), 'tipo' => 'importacao_pessoa', 'direcao' => 'inbound', 'status' => 'erro', 'registros_processados' => 1, 'registros_sucesso' => 0, 'registros_falha' => 1]);

        $this->como($this->usuario($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/sync-logs/{$log->id}/reprocessar")
            ->assertForbidden();
    }
}
