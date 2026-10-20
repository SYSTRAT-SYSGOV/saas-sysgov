<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use DomainException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Modules\Pessoas\Events\PessoaAtualizada;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ResolucaoPessoaService;
use Modules\Pessoas\Support\RegraNegocioException;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Resolução por CPF para módulos consumidores e evento PessoaAtualizada (change educacao-multiescola, B.1). */
final class ResolucaoPessoaTest extends PessoasTestCase
{
    private Tenant $tenant;

    private ResolucaoPessoaService $servico;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->servico = app(ResolucaoPessoaService::class);
    }

    public function test_cria_pessoa_quando_cpf_nao_existe_e_nao_cria_usuario(): void
    {
        $cpf = $this->cpfValido();

        $pessoa = $this->servico->resolverPorCpf($cpf, ['nome' => 'Ana Lima', 'nome_mae' => 'Maria Lima'], 'escola');

        $this->assertSame('Ana Lima', $pessoa->nome);
        $this->assertSame('Maria Lima', $pessoa->fresh()->nome_mae);
        $this->assertSame(1, Pessoa::count());
        $this->assertSame(0, DB::table('pessoas_usuarios')->count());
        $this->assertDatabaseHas('audit_logs', ['action' => 'pessoa.criada_por_modulo']);
    }

    public function test_pessoa_existente_nao_e_sobrescrita_so_completada(): void
    {
        $cpf = $this->cpfValido();
        $existente = Pessoa::create(['cpf' => $cpf, 'nome' => 'Ana Lima', 'nome_mae' => 'Maria Original']);

        $pessoa = $this->servico->resolverPorCpf($cpf, ['nome' => 'ANA L.', 'nome_mae' => 'Outra Mãe', 'nome_pai' => 'José Lima'], 'escola');

        $this->assertSame($existente->id, $pessoa->id);
        $pessoa->refresh();
        $this->assertSame('Ana Lima', $pessoa->nome);
        $this->assertSame('Maria Original', $pessoa->nome_mae);
        $this->assertSame('José Lima', $pessoa->nome_pai);
        $this->assertSame(1, Pessoa::count());
    }

    public function test_cpf_com_mascara_resolve_a_mesma_pessoa(): void
    {
        $cpf = $this->cpfValido();
        $mascarado = substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
        $a = $this->servico->resolverPorCpf($cpf, ['nome' => 'Ana'], 'escola');

        $this->assertSame($a->id, $this->servico->resolverPorCpf($mascarado, ['nome' => 'Ana'], 'cursos')->id);
    }

    public function test_cpf_invalido_e_recusado(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('CPF inválido.');

        $this->servico->resolverPorCpf('123.456.789-00', ['nome' => 'X'], 'escola');
    }

    public function test_pessoa_excluida_com_o_mesmo_cpf_e_restaurada(): void
    {
        $cpf = $this->cpfValido();
        $pessoa = Pessoa::create(['cpf' => $cpf, 'nome' => 'Ana']);
        $pessoa->delete();

        $resolvida = $this->servico->resolverPorCpf($cpf, ['nome' => 'Ana'], 'escola');

        $this->assertSame($pessoa->id, $resolvida->id);
        $this->assertFalse($resolvida->trashed());
    }

    public function test_alteracao_de_dado_civil_dispara_o_evento_com_os_campos(): void
    {
        Event::fake([PessoaAtualizada::class]);
        $pessoa = Pessoa::create(['cpf' => $this->cpfValido(), 'nome' => 'Ana Lima']);

        $pessoa->update(['nome' => 'Ana Lima Souza', 'nis' => '12345678901']);
        $pessoa->update(['nis' => '10987654321']); // não é dado civil acompanhado

        Event::assertDispatchedTimes(PessoaAtualizada::class, 1);
        Event::assertDispatched(PessoaAtualizada::class, fn (PessoaAtualizada $e): bool => $e->pessoaId === $pessoa->id && $e->camposAlterados === ['nome']);
    }
    // ----------------------------------------------------- pessoa sem documento (unificar-cadastro-pessoas)

    public function test_cria_pessoa_pendente_sem_cpf_e_audita_a_origem(): void
    {
        $pessoa = $this->servico->resolverSemDocumento(['nome' => 'Adulto Sem CPF', 'data_nascimento' => '1980-05-05'], 'passeio');

        $this->assertTrue($pessoa->fresh()->documento_pendente);
        $this->assertDatabaseHas('audit_logs', ['action' => 'pessoa.criada_por_modulo']);
        $this->assertSame(0, DB::table('pessoas_usuarios')->count());
    }

    public function test_menor_sem_responsavel_e_recusado(): void
    {
        $this->expectException(RegraNegocioException::class);
        $this->servico->resolverSemDocumento(['nome' => 'Criança', 'data_nascimento' => now()->subYears(7)->toDateString()], 'escola');
    }

    public function test_menor_com_responsavel_e_criado_ligado_ao_responsavel(): void
    {
        $mae = Pessoa::factory()->create();

        $crianca = $this->servico->resolverSemDocumento(
            ['nome' => 'Criança', 'data_nascimento' => now()->subYears(7)->toDateString()],
            'escola',
            $mae->id,
        );

        $this->assertSame($mae->id, $crianca->fresh()->responsavel_id);
    }

    public function test_responsavel_juridico_e_recusado(): void
    {
        $empresa = Pessoa::factory()->juridica()->create();

        $this->expectException(RegraNegocioException::class);
        $this->servico->resolverSemDocumento(
            ['nome' => 'Criança', 'data_nascimento' => now()->subYears(7)->toDateString()],
            'escola',
            $empresa->id,
        );
    }

    public function test_pessoa_semelhante_e_sugerida_antes_de_criar(): void
    {
        $existente = Pessoa::create(['nome' => 'João da Silva', 'data_nascimento' => '2015-03-10', 'responsavel_id' => Pessoa::factory()->create()->id]);

        try {
            $this->servico->resolverSemDocumento(['nome' => '  JOAO  da silva ', 'data_nascimento' => '2015-03-10'], 'escola', $existente->responsavel_id);
            $this->fail('Deveria recusar por pessoa semelhante.');
        } catch (RegraNegocioException $e) {
            $this->assertSame('pessoa_semelhante_existente', $e->codigo);
            $this->assertSame($existente->id, $e->contexto['sugestoes'][0]['id']);
        }

        $this->assertSame(2, Pessoa::count(), 'nada foi criado além do responsável');
    }

    public function test_criacao_confirmada_ignora_a_sugestao(): void
    {
        $responsavel = Pessoa::factory()->create();
        Pessoa::create(['nome' => 'João da Silva', 'data_nascimento' => '2015-03-10', 'responsavel_id' => $responsavel->id]);

        $nova = $this->servico->resolverSemDocumento(['nome' => 'João da Silva', 'data_nascimento' => '2015-03-10'], 'escola', $responsavel->id, confirmarNovo: true);

        $this->assertTrue($nova->documento_pendente);
        $this->assertSame(3, Pessoa::count());
    }

    public function test_completar_campos_vazios_nao_sobrescreve(): void
    {
        $pessoa = Pessoa::factory()->create(['nome_mae' => 'Original', 'nome_pai' => null]);

        $this->servico->completarCamposVazios($pessoa, ['nome_mae' => 'Outra', 'nome_pai' => 'Pai Novo'], 'escola');

        $this->assertSame('Original', $pessoa->fresh()->nome_mae);
        $this->assertSame('Pai Novo', $pessoa->fresh()->nome_pai);
    }
}
