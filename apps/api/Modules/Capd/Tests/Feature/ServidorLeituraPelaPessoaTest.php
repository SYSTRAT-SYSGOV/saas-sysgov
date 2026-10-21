<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\EmbedTokenService;
use Modules\Capd\Services\NotaCalculoService;
use Modules\Capd\Services\ServidorService;
use Modules\Pessoas\Models\Pessoa;
use Tests\TestCase;

/** Fase 5, etapa A do Capd: CPF, nascimento e nome social lidos da pessoa; a cópia local só é reserva. */
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

    /** @param array<string, mixed> $dados */
    private function novo(array $dados): Servidor
    {
        static $n = 0;

        // `cpf` ainda é NOT NULL e único na tabela; a reserva muda a cada servidor (a etapa B remove a coluna).
        return Servidor::create([...['cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD', 'cpf' => sprintf('000.000.%03d-00', ++$n)], ...$dados]);
    }

    private function servidorComPessoa(): Servidor
    {
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'documento' => self::CPF, 'nome' => 'João Pereira da Silva', 'nome_social' => 'Joana Pereira', 'data_nascimento' => '1980-02-03']);

        return $this->novo(['matricula' => 'M-1', 'pessoa_id' => $pessoa->id, 'nome_completo' => 'João Pereira da Silva', 'cpf' => '000.000.000-00', 'nome_social' => 'Copia', 'data_nascimento' => '1999-09-09']);
    }

    public function test_pessoa_carregada_vence_a_copia_local_divergente(): void
    {
        $servidor = $this->servidorComPessoa()->load('pessoa');

        $this->assertSame('529.982.247-25', $servidor->cpfFormatado());
        $this->assertSame(self::CPF, $servidor->cpfDigitos());
        $this->assertSame('1980-02-03', $servidor->nascimentoDaPessoa()?->toDateString());
        $this->assertSame('Joana Pereira', $servidor->nomeSocialDaPessoa());
    }

    public function test_sem_a_pessoa_carregada_usa_a_copia_local_sem_consulta_escondida(): void
    {
        $servidor = $this->servidorComPessoa()->fresh();

        $consultas = 0;
        \DB::listen(function () use (&$consultas): void {
            $consultas++;
        });

        $this->assertSame('1999-09-09', $servidor->nascimentoDaPessoa()?->toDateString());
        $this->assertSame('Copia', $servidor->nomeSocialDaPessoa());
        $this->assertSame('00000000000', $servidor->cpfDigitos());
        $this->assertSame(0, $consultas);
    }

    public function test_pessoa_pendente_nao_expoe_cpf_nem_cai_na_copia(): void
    {
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'nome' => 'Sem CPF']);
        $servidor = $this->novo(['matricula' => 'M-2', 'pessoa_id' => $pessoa->id, 'nome_completo' => 'Sem CPF', 'cpf' => '529.982.247-25'])->load('pessoa');

        $this->assertTrue($pessoa->documento_pendente);
        $this->assertSame('', $servidor->cpfFormatado(), 'pessoa pendente não cai na cópia local');
    }

    public function test_busca_por_cpf_encontra_pela_pessoa_mesmo_com_a_copia_zerada(): void
    {
        $servidor = $this->servidorComPessoa();
        $servidor->forceFill(['cpf' => '999.999.999-99'])->save();

        $this->assertSame($servidor->id, Servidor::query()->comCpf('529.982.247-25')->sole()->id);
        $this->assertSame(0, Servidor::query()->comCpf('52998224')->count(), 'CPF incompleto não casa com ninguém');
        $this->assertSame(0, Servidor::query()->comCpf('11144477735')->count());
    }

    public function test_busca_por_cpf_ainda_acha_servidor_sem_pessoa_pela_copia_local(): void
    {
        $servidor = $this->novo(['matricula' => 'M-3', 'nome_completo' => 'Legado', 'cpf' => '529.982.247-25']);

        $this->assertSame($servidor->id, Servidor::query()->comCpf(self::CPF)->sole()->id);
    }

    public function test_lista_e_token_de_embed_acham_o_servidor_pelo_cpf_da_pessoa(): void
    {
        $servidor = $this->servidorComPessoa();
        $servidor->forceFill(['cpf' => '999.999.999-99'])->save();

        $lista = app(ServidorService::class)->list(['search' => self::CPF]);
        $this->assertSame([$servidor->id], $lista->pluck('id')->all());

        $token = app(EmbedTokenService::class)->generateToken($this->tenant->id, '529.982.247-25');
        $this->assertSame($servidor->id, app(EmbedTokenService::class)->validateToken($token)['servidor_id'] ?? null);
    }

    public function test_desempate_por_idade_usa_o_nascimento_da_pessoa(): void
    {
        $velho = $this->servidorComPessoa()->load('pessoa');
        $outraPessoa = Pessoa::create(['tipo' => 'fisica', 'documento' => '11144477735', 'nome' => 'Mais Novo', 'data_nascimento' => '1990-01-01']);
        $novo = $this->novo(['matricula' => 'M-4', 'pessoa_id' => $outraPessoa->id, 'nome_completo' => 'Mais Novo', 'data_nascimento' => '1970-01-01'])->load('pessoa');

        // A cópia local diria o contrário (1970 contra 1999): vale a pessoa (1980 contra 1990).
        $ranking = app(NotaCalculoService::class)->rankingComDesempate(collect([
            ['servidor' => $novo, 'nfc' => '80.00'],
            ['servidor' => $velho, 'nfc' => '80.00'],
        ]));

        $this->assertSame(['M-1', 'M-4'], $ranking->map(fn (array $i) => $i['servidor']->matricula)->all());
    }

    private function usuario(): User
    {
        $user = User::create(['name' => 'Gestor', 'email' => 'gestor@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        return $user;
    }

    public function test_json_da_lista_traz_o_cpf_da_pessoa_e_nunca_a_relacao(): void
    {
        $servidor = $this->servidorComPessoa();

        $resposta = $this->actingAs($this->usuario())->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson('/api/capd/servidores');

        $resposta->assertOk();
        /** @var list<array<string, mixed>> $data */
        $data = $resposta->json('data');
        $item = array_values(array_filter($data, fn (array $s): bool => $s['id'] === $servidor->id))[0];
        $this->assertSame('529.982.247-25', $item['cpf'], 'a cópia local divergente (000.000.000-00) não vence a pessoa');
        $this->assertArrayNotHasKey('pessoa', $item);
        $this->assertStringNotContainsString('Joana Pereira', $resposta->getContent(), 'dado civil da pessoa não sai na lista');
    }

    public function test_json_da_ficha_traz_o_cpf_da_pessoa_e_nunca_a_relacao(): void
    {
        $servidor = $this->servidorComPessoa();

        $resposta = $this->actingAs($this->usuario())->withHeader('X-Tenant-ID', (string) $this->tenant->id)->getJson("/api/capd/servidores/{$servidor->id}");

        $resposta->assertOk()->assertJsonPath('cpf', '529.982.247-25')->assertJsonMissingPath('pessoa');
    }

    public function test_json_sem_pessoa_carregada_mantem_a_coluna_atual(): void
    {
        $servidor = $this->novo(['matricula' => 'M-9', 'nome_completo' => 'Legado', 'cpf' => '111.444.777-35']);

        $this->assertSame('111.444.777-35', $servidor->toArray()['cpf']);
    }
}
