<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\EmbedTokenService;
use Modules\Capd\Services\NotaCalculoService;
use Modules\Capd\Services\ServidorService;
use Modules\Capd\Tests\Support\ServidorDeTeste;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

/** Fase 5: CPF, nome social e nascimento do servidor vivem só na pessoa; leitura, busca, JSON e cadastro passam por ela. */
final class ServidorLeituraPelaPessoaTest extends TestCase
{
    use RefreshDatabase;

    private const CPF = '52998224725';

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura de Araucária', 'slug' => 'araucaria', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function servidorComPessoa(string $matricula = 'M-1'): Servidor
    {
        return ServidorDeTeste::criar([
            'matricula' => $matricula, 'nome_completo' => 'João Pereira da Silva', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD',
            'cpf' => self::CPF, 'nome_social' => 'Joana Pereira', 'data_nascimento' => '1980-02-03',
        ]);
    }

    private function usuario(): User
    {
        $user = User::create(['name' => 'Gestor', 'email' => 'gestor@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        return $user;
    }

    public function test_leitura_vem_da_pessoa(): void
    {
        $servidor = $this->servidorComPessoa()->fresh();

        $this->assertSame('529.982.247-25', $servidor->cpfFormatado());
        $this->assertSame(self::CPF, $servidor->cpfDigitos());
        $this->assertSame('1980-02-03', $servidor->nascimentoDaPessoa()?->toDateString());
        $this->assertSame('Joana Pereira', $servidor->nomeSocialDaPessoa());
    }

    public function test_pessoa_pendente_nao_tem_cpf(): void
    {
        $servidor = ServidorDeTeste::criar(['matricula' => 'M-2', 'nome_completo' => 'Sem CPF', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD'])->fresh();

        $this->assertTrue($servidor->pessoa->documento_pendente);
        $this->assertSame('', $servidor->cpfFormatado());
    }

    public function test_busca_por_cpf_acha_pela_pessoa(): void
    {
        $servidor = $this->servidorComPessoa();

        $this->assertSame($servidor->id, Servidor::query()->comCpf('529.982.247-25')->sole()->id);
        $this->assertSame(0, Servidor::query()->comCpf('52998224')->count(), 'CPF incompleto não casa com ninguém');
        $this->assertSame(0, Servidor::query()->comCpf('11144477735')->count());
    }

    public function test_lista_e_token_de_embed_acham_o_servidor_pelo_cpf(): void
    {
        $servidor = $this->servidorComPessoa();

        $lista = app(ServidorService::class)->list(['search' => self::CPF]);
        $this->assertSame([$servidor->id], $lista->pluck('id')->all());

        $token = app(EmbedTokenService::class)->generateToken($this->tenant->id, '529.982.247-25');
        $this->assertSame($servidor->id, app(EmbedTokenService::class)->validateToken($token)['servidor_id'] ?? null);
    }

    public function test_desempate_por_idade_usa_o_nascimento_da_pessoa(): void
    {
        $velho = $this->servidorComPessoa();
        $novo = ServidorDeTeste::criar(['matricula' => 'M-4', 'nome_completo' => 'Mais Novo', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD', 'cpf' => '11144477735', 'data_nascimento' => '1990-01-01']);

        $ranking = app(NotaCalculoService::class)->rankingComDesempate(collect([
            ['servidor' => $novo, 'nfc' => '80.00'],
            ['servidor' => $velho, 'nfc' => '80.00'],
        ]));

        $this->assertSame(['M-1', 'M-4'], $ranking->map(fn (array $i) => $i['servidor']->matricula)->all());
    }

    public function test_json_da_lista_traz_cpf_nome_social_e_nascimento_da_pessoa_e_nunca_a_relacao(): void
    {
        $servidor = $this->servidorComPessoa();

        $resposta = $this->actingAs($this->usuario())->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson('/api/capd/servidores');

        $resposta->assertOk();
        /** @var list<array<string, mixed>> $data */
        $data = $resposta->json('data');
        $item = array_values(array_filter($data, fn (array $s): bool => $s['id'] === $servidor->id))[0];
        $this->assertSame('529.982.247-25', $item['cpf']);
        $this->assertSame('Joana Pereira', $item['nome_social']);
        $this->assertSame('1980-02-03', $item['data_nascimento']);
        $this->assertArrayNotHasKey('pessoa', $item);
    }

    public function test_json_da_ficha_traz_o_cpf_da_pessoa_e_nunca_a_relacao(): void
    {
        $servidor = $this->servidorComPessoa();

        $this->actingAs($this->usuario())->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson("/api/capd/servidores/{$servidor->id}")
            ->assertOk()->assertJsonPath('cpf', '529.982.247-25')->assertJsonMissingPath('pessoa');
    }

    public function test_relacao_com_colunas_parciais_nao_quebra_o_json(): void
    {
        $this->servidorComPessoa();

        // `chefiaImediata:id,nome_completo,matricula` não traz o `pessoa_id`: sem pessoa carregada os campos civis não entram.
        $parcial = Servidor::query()->select(['id', 'nome_completo', 'matricula'])->firstOrFail()->toArray();

        $this->assertArrayNotHasKey('cpf', $parcial);
        $this->assertArrayNotHasKey('pessoa', $parcial);
        $this->assertSame('João Pereira da Silva', $parcial['nome_completo']);
    }

    public function test_cadastro_manual_recusa_cpf_invalido_em_vez_de_perder_o_dado(): void
    {
        try {
            app(ServidorService::class)->create(['matricula' => 'M-9', 'cpf' => '12345678901', 'nome_completo' => 'CPF Ruim', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD']);
            $this->fail('deveria recusar o CPF inválido');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('cpf', $e->errors());
        }

        $this->assertSame(0, Servidor::query()->count());
        $this->assertSame(0, Pessoa::query()->count());
    }

    public function test_edicao_recusa_cpf_invalido_e_aceita_cpf_novo_na_pessoa_pendente(): void
    {
        $servidor = ServidorDeTeste::criar(['matricula' => 'M-5', 'nome_completo' => 'Sem CPF', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD']);
        $pendente = $servidor->pessoa_id;

        try {
            app(ServidorService::class)->update($servidor, ['cpf' => '12345678901']);
            $this->fail('deveria recusar o CPF inválido');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('cpf', $e->errors());
        }

        $atualizado = app(ServidorService::class)->update($servidor, ['cpf' => self::CPF]);
        $this->assertSame($pendente, $atualizado->pessoa_id, 'a mesma pessoa ganha o CPF, sem criar outra');
        $this->assertSame('529.982.247-25', $atualizado->cpfFormatado());
        $this->assertSame(1, Pessoa::query()->count());
    }
}
