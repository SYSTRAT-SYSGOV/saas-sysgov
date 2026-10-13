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
}
