<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Services\ConciliacaoPessoaService;
use Modules\Pessoas\Services\ConciliacaoRegistry;

/** Spec escola: conciliação dos alunos existentes com o cadastro central (`pessoas:conciliar escola`). */
final class ConciliacaoAlunosTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private Tenant $tenant;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $escola = $this->escola($this->tenant, 'Escola A');
        $this->turma = $this->naEscola($this->tenant, $escola, fn (): Turma => Turma::create(['nome' => '6º A', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]));
    }

    /** @param array<string, mixed> $dados */
    private function aluno(array $dados): Aluno
    {
        return $this->noTenant($this->tenant, fn () => Aluno::create(['turma_id' => $this->turma->id, 'situacao' => 'ativo', ...$dados]));
    }

    /** @return array<string, mixed> */
    private function conciliar(bool $dryRun): array
    {
        return $this->noTenant($this->tenant, fn () => app(ConciliacaoPessoaService::class)->conciliar(app(ConciliacaoRegistry::class)->obter('escola'), $dryRun));
    }

    public function test_aluno_com_cpf_e_vinculado_e_sem_cpf_menor_sai_sem_responsavel(): void
    {
        $this->aluno(['nome' => 'Ana Lima', 'cpf' => '52998224725', 'nascimento' => '2010-01-05']);
        $this->aluno(['nome' => 'Davi Souza', 'nascimento' => '2016-03-10']);

        $dry = $this->conciliar(true);
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Pessoa::count()), 'dry-run não grava');

        $real = $this->conciliar(false);
        $this->assertSame($dry['vinculados_por_documento'], $real['vinculados_por_documento']);
        $this->assertSame(1, $real['vinculados_por_documento']);
        $this->assertCount(1, $real['sem_responsavel']);
        $this->assertSame(1, $this->noTenant($this->tenant, fn () => Aluno::query()->whereNotNull('pessoa_id')->count()));
    }

    public function test_reexecutar_nao_duplica_e_divergencia_nao_sobrescreve_a_pessoa(): void
    {
        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::create(['tipo' => 'fisica', 'documento' => '52998224725', 'nome' => 'Ana Lima', 'data_nascimento' => '2010-01-05']));
        $this->aluno(['nome' => 'Ana Lima', 'cpf' => '52998224725', 'nascimento' => '2010-02-06']);

        $this->conciliar(false);
        $segunda = $this->conciliar(false);

        $this->assertSame(1, $this->noTenant($this->tenant, fn () => Pessoa::count()));
        $this->assertSame(1, $this->noTenant($this->tenant, fn () => PessoaDivergencia::count()));
        $this->assertSame(0, $segunda['divergencias_registradas']);
        $this->assertSame('2010-01-05', $this->noTenant($this->tenant, fn () => $pessoa->refresh()->data_nascimento->toDateString()));
    }
}
