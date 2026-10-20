<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Capd\Models\RhIntegracao;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\ServidorService;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Models\PessoaVinculo;
use Modules\Pessoas\Services\ConciliacaoPessoaService;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Tests\TestCase;

/** Spec capd: servidor avaliado vinculado ao cadastro central de pessoas (unificar-pessoas-fase-2-capd). */
final class ServidorPessoaTest extends TestCase
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

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function dados(array $extra = []): array
    {
        return ['matricula' => 'M-1', 'cpf' => self::CPF, 'nome_completo' => 'João da Silva', 'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD', ...$extra];
    }

    public function test_servidor_com_cpf_de_pessoa_existente_vincula_sem_criar_outra_nem_sobrescrever(): void
    {
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'documento' => self::CPF, 'nome' => 'João Pereira da Silva', 'data_nascimento' => '1980-02-03']);

        $servidor = app(ServidorService::class)->create($this->dados(['data_nascimento' => '1999-09-09']));

        $this->assertSame($pessoa->id, $servidor->fresh()->pessoa_id);
        $this->assertSame(1, Pessoa::count());
        $pessoa->refresh();
        $this->assertSame('João Pereira da Silva', $pessoa->nome);
        $this->assertSame('1980-02-03', $pessoa->data_nascimento->toDateString());
        // A cópia de exibição passa a refletir a pessoa (mestre).
        $this->assertSame('João Pereira da Silva', $servidor->fresh()->nome_completo);
    }

    public function test_servidor_novo_cria_pessoa_e_vinculo_funcional(): void
    {
        $servidor = app(ServidorService::class)->create($this->dados());

        $pessoa = Pessoa::sole();
        $this->assertSame($pessoa->id, $servidor->fresh()->pessoa_id);
        $vinculo = PessoaVinculo::sole();
        $this->assertSame('servidor_carreira', $vinculo->tipo_vinculo);
        $this->assertSame('M-1', $vinculo->matricula);
        $this->assertSame($servidor->id, $vinculo->dados['servidor_id']);
    }

    public function test_editar_nome_do_servidor_grava_na_pessoa(): void
    {
        $servidor = app(ServidorService::class)->create($this->dados());

        app(ServidorService::class)->update($servidor, ['nome_completo' => 'João Pedro da Silva']);

        $this->assertSame('João Pedro da Silva', Pessoa::sole()->nome);
    }

    public function test_rh_sem_cpf_valido_cria_pessoa_pendente_e_nao_interrompe_o_lote(): void
    {
        $integracao = RhIntegracao::create(['tenant_id' => $this->tenant->id, 'nome' => 'ERP', 'driver' => 'betha', 'api_key' => 'rh_key_test_1234567890abcdef', 'is_active' => true]);

        $resultado = $this->withHeader('X-RH-API-Key', 'rh_key_test_1234567890abcdef')->postJson('/api/capd/rh-gateway/servidores/sync', ['servidores' => [
            ['matricula' => 'R-1', 'nome_completo' => 'Sem Cpf Um', 'cpf' => ''],
            ['matricula' => 'R-2', 'nome_completo' => 'Com Cpf', 'cpf' => self::CPF],
            ['matricula' => 'R-3', 'nome_completo' => 'Sem Cpf Dois', 'cpf' => '123'],
        ]])->assertOk()->json();

        $this->assertSame(3, $resultado['inseridos']);
        $this->assertSame(3, Servidor::query()->whereNotNull('pessoa_id')->count());
        $this->assertSame(2, Pessoa::query()->where('documento_pendente', true)->count());
        $this->assertNotNull($integracao->fresh()->ultima_sincronizacao_em);

        // Sincronizar de novo não duplica pessoas nem vínculos.
        $this->withHeader('X-RH-API-Key', 'rh_key_test_1234567890abcdef')->postJson('/api/capd/rh-gateway/servidores/sync', ['servidores' => [
            ['matricula' => 'R-1', 'nome_completo' => 'Sem Cpf Um', 'cpf' => ''],
        ]])->assertOk();
        $this->assertSame(3, Pessoa::count());
        $this->assertSame(3, PessoaVinculo::count());
    }

    public function test_conciliacao_vincula_servidores_existentes_sem_alterar_avaliacoes(): void
    {
        $semPessoa = fn (string $mat, string $cpf, string $nome): Servidor => Servidor::create([
            'tenant_id' => $this->tenant->id, 'matricula' => $mat, 'cpf' => $cpf, 'nome_completo' => $nome,
            'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD', 'situacao_funcional' => 'ativo',
        ]);
        $a = $semPessoa('C-1', '529.982.247-25', 'Ana Lima');
        $b = $semPessoa('C-2', '000.000.000-00', 'Bruno Dias');
        Pessoa::create(['tipo' => 'fisica', 'documento' => '11144477735', 'nome' => 'Carla Souza']);
        $c = $semPessoa('C-3', '111.444.777-35', 'Carla de Souza');
        $avaliacoesAntes = DB::table('capd_avaliacoes')->get()->toArray();

        $modulo = app(ConciliacaoRegistry::class)->obter('capd');
        $dry = app(ConciliacaoPessoaService::class)->conciliar($modulo, true);
        $this->assertNull($a->fresh()->pessoa_id, 'dry-run não grava');
        $real = app(ConciliacaoPessoaService::class)->conciliar($modulo, false);

        $this->assertSame($dry['vinculados_por_documento'], $real['vinculados_por_documento']);
        $this->assertSame(2, $real['vinculados_por_documento']);
        $this->assertSame(1, $real['criadas_pendentes']);
        $this->assertNotNull($a->fresh()->pessoa_id);
        $this->assertTrue(Pessoa::findOrFail($b->fresh()->pessoa_id)->documento_pendente);
        $this->assertSame(1, PessoaDivergencia::count(), '"Carla de Souza" ≠ "Carla Souza"');
        $this->assertSame('Carla de Souza', $c->fresh()->nome_completo, 'a conciliação não altera o servidor');
        $this->assertEquals($avaliacoesAntes, DB::table('capd_avaliacoes')->get()->toArray());

        $segunda = app(ConciliacaoPessoaService::class)->conciliar($modulo, false);
        $this->assertSame(0, $segunda['criadas_pendentes'] + $segunda['divergencias_registradas']);
    }
}
