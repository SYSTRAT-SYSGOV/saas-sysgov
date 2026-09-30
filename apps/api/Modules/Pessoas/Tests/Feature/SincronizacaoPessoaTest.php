<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\Http;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaIntegracao;
use Modules\Pessoas\Services\SincronizacaoPessoaService;
use Modules\Pessoas\Tests\PessoasTestCase;

final class SincronizacaoPessoaTest extends PessoasTestCase
{
    private Tenant $tenant;
    private SincronizacaoPessoaService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->service = app(SincronizacaoPessoaService::class);
    }

    public function test_sistema_externo_indisponivel_registra_falha_sem_afetar_o_resto_do_modulo(): void
    {
        Http::fake(['prefeitura.example/*' => Http::response('fora do ar', 500)]);
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $cpf = $this->cpfValido();

        $log = $this->service->sincronizar($integracao, $cpf);

        self::assertSame('erro', $log->status);
        self::assertSame(0, Pessoa::count());
        self::assertSame($cpf, $log->refresh()->cpf);

        // O restante do módulo continua funcionando normalmente.
        self::assertSame(1, Pessoa::create(['nome' => 'Outra Pessoa', 'cpf' => $this->cpfValido()])->id ? 1 : 0);
    }

    public function test_sincronizacao_com_sucesso_importa_a_pessoa_e_registra_log(): void
    {
        Http::fake(['prefeitura.example/*' => Http::response(['nome' => 'Pessoa Importada'])]);
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $cpf = $this->cpfValido();

        $log = $this->service->sincronizar($integracao, $cpf);

        self::assertSame('sucesso', $log->status);
        self::assertSame(1, Pessoa::count());
        self::assertSame($cpf, $log->refresh()->cpf);
    }

    public function test_sincronizacao_pessoa_nao_encontrada_tambem_registra_cpf_no_log(): void
    {
        Http::fake(['prefeitura.example/*' => Http::response('', 404)]);
        $integracao = PessoaIntegracao::create(['nome' => 'Cadastro Único', 'driver' => 'generic_rest', 'api_url' => 'https://prefeitura.example/api', 'is_active' => true]);
        $cpf = $this->cpfValido();

        $log = $this->service->sincronizar($integracao, $cpf);

        self::assertSame('nao_encontrado', $log->status);
        self::assertSame($cpf, $log->refresh()->cpf);
    }
}
