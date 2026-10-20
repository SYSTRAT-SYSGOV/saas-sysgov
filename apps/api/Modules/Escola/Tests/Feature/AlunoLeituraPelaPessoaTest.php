<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;

/** Fase 5, etapa A: nascimento e CPF do aluno passam a ser lidos da pessoa; a cópia local não manda mais. */
final class AlunoLeituraPelaPessoaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private const CPF = '52998224725';

    private Tenant $tenant;

    private User $admin;

    private Escola $escola;

    private Turma $turma;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant);
        $this->escola = $this->escola($this->tenant, 'Escola A');
        $this->turma = $this->naEscola($this->tenant, $this->escola, fn (): Turma => Turma::create(['nome' => '6º A', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]));
    }

    private function http(): static
    {
        return $this->como($this->admin, $this->tenant)->withHeader('X-Escola-ID', (string) $this->escola->id);
    }

    /** Cria o aluno com CPF e nascimento pela API (a pessoa nasce com os mesmos dados). */
    private function alunoComCpf(): int
    {
        return (int) $this->http()->postJson('/api/escola/alunos', [
            'nome' => 'Ana Lima', 'cpf' => self::CPF, 'nascimento' => '2012-04-05', 'turma_id' => $this->turma->id,
        ])->assertCreated()->json('id');
    }

    public function test_api_mostra_nascimento_e_cpf_da_pessoa_mesmo_com_a_copia_local_diferente(): void
    {
        $id = $this->alunoComCpf();
        // A cópia do aluno diverge e perde o CPF; a pessoa continua com os dados certos.
        DB::table('escola_alunos')->where('id', $id)->update(['nascimento' => '1999-01-01', 'cpf' => null, 'cpf_hash' => null]);

        $this->http()->getJson("/api/escola/alunos/{$id}")->assertOk()
            ->assertJsonPath('nascimento', '2012-04-05')
            ->assertJsonPath('cpf_mascarado', '***.982.247-**');

        $this->http()->getJson('/api/escola/alunos')->assertOk()
            ->assertJsonPath('data.0.nascimento', '2012-04-05');
    }

    public function test_busca_por_cpf_acha_o_aluno_pela_pessoa(): void
    {
        $id = $this->alunoComCpf();
        DB::table('escola_alunos')->where('id', $id)->update(['cpf' => null, 'cpf_hash' => null]);

        $this->http()->getJson('/api/escola/alunos?busca=529.982.247-25')->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $id);
    }

    public function test_cpf_repetido_na_mesma_escola_e_recusado_pela_pessoa(): void
    {
        $id = $this->alunoComCpf();
        DB::table('escola_alunos')->where('id', $id)->update(['cpf' => null, 'cpf_hash' => null]);

        $this->http()->postJson('/api/escola/alunos', ['nome' => 'Outra Ana', 'cpf' => self::CPF, 'turma_id' => $this->turma->id])
            ->assertStatus(422)->assertJsonValidationErrors('cpf');
        $this->assertSame(1, $this->noTenant($this->tenant, fn () => Aluno::query()->withoutGlobalScope('escola')->count()));
    }

    public function test_aluno_sem_cpf_mostra_cpf_nulo_e_nascimento_da_pessoa(): void
    {
        $mae = $this->noTenant($this->tenant, fn () => \Modules\Pessoas\Models\Pessoa::create(['tipo' => 'fisica', 'documento' => '11144477735', 'nome' => 'Marta']));
        $id = (int) $this->http()->postJson('/api/escola/alunos', [
            'nome' => 'Davi Souza', 'nascimento' => '2016-03-10', 'turma_id' => $this->turma->id, 'responsavel_id' => $mae->id,
        ])->assertCreated()->json('id');

        $this->http()->getJson("/api/escola/alunos/{$id}")->assertOk()
            ->assertJsonPath('cpf_mascarado', null)
            ->assertJsonPath('nascimento', '2016-03-10');
    }
}
