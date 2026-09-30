<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Models\PessoaSyncLog;
use Modules\Pessoas\Tests\PessoasTestCase;

final class ImportacaoAssincronaTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_importacao_responde_202_e_grava_outbox_sem_bloquear(): void
    {
        PessoaIntegracao::create([
            'nome' => 'API Prefeitura',
            'driver' => 'generic_rest',
            'api_url' => 'https://prefeitura.test/api',
            'is_active' => true,
        ]);

        $cpf = $this->cpfValido();

        $resposta = $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/pessoas/importacoes', ['documento' => $cpf]);

        $resposta->assertAccepted()
            ->assertJsonPath('message', 'Importação agendada.');

        // O evento foi persistido no outbox
        $eventos = DB::table('outbox_events')
            ->where('event_type', \Modules\Pessoas\Listeners\ImportarPessoaListener::TIPO)
            ->get();

        self::assertCount(1, $eventos);
        self::assertStringContainsString($cpf, json_encode($eventos->first()->payload));
    }

    public function test_processamento_outbox_com_sucesso_gera_pessoa_e_sync_log(): void
    {
        Http::fake([
            'prefeitura.test/*' => Http::response([
                'nome' => 'Servidor Importado da Prefeitura',
                'sexo' => 'M',
            ]),
        ]);

        $integracao = PessoaIntegracao::create([
            'nome' => 'API Prefeitura',
            'driver' => 'generic_rest',
            'api_url' => 'https://prefeitura.test/api',
            'is_active' => true,
        ]);

        $cpf = $this->cpfValido();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/pessoas/importacoes', ['documento' => $cpf])
            ->assertAccepted();

        $this->artisan('outbox:process')->assertSuccessful();

        // Pessoa criada
        self::assertSame(1, Pessoa::count());
        self::assertSame('Servidor Importado da Prefeitura', Pessoa::first()->nome);

        // Sync log registrado
        $log = PessoaSyncLog::latest('id')->first();
        self::assertNotNull($log);
        self::assertSame('sucesso', $log->status);
        self::assertSame($integracao->id, $log->integracao_id);
        self::assertSame(1, $log->registros_processados);
    }

    public function test_processamento_com_falha_externa_registra_sync_log_de_erro(): void
    {
        Http::fake([
            'prefeitura.test/*' => Http::response(['error' => 'Serviço Indisponível'], 503),
        ]);

        $integracao = PessoaIntegracao::create([
            'nome' => 'API Prefeitura',
            'driver' => 'generic_rest',
            'api_url' => 'https://prefeitura.test/api',
            'is_active' => true,
        ]);

        $cpf = $this->cpfValido();

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson('/api/pessoas/importacoes', ['documento' => $cpf])
            ->assertAccepted();

        $this->artisan('outbox:process')->assertSuccessful();

        // Nenhuma pessoa criada
        self::assertSame(0, Pessoa::count());

        // Sync log registrado com status erro
        $log = PessoaSyncLog::latest('id')->first();
        self::assertNotNull($log);
        self::assertSame('erro', $log->status);
        self::assertSame($integracao->id, $log->integracao_id);
    }
}
