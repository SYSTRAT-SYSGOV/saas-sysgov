<?php

declare(strict_types=1);

namespace Modules\Escola\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Modules\Escola\Models\Aluno;
use Modules\Escola\Models\Escola;
use Modules\Escola\Models\Turma;
use Modules\Escola\Models\Turno;
use Modules\Escola\Tests\Concerns\CenarioEscola;
use Modules\Escola\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaVinculo;

/** Aluno ligado ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, fase B). */
final class AlunoPessoaTest extends TestCase
{
    use CenarioEscola;
    use RefreshDatabase;

    private const CPF = '52998224725';

    private const CPF_2 = '11144477735';

    private Tenant $tenant;

    private User $admin;

    private Escola $escolaA;

    private Escola $escolaB;

    private Turma $turmaA;

    private Turma $turmaB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant);
        $this->escolaA = $this->escola($this->tenant, 'Escola A');
        $this->escolaB = $this->escola($this->tenant, 'Escola B');
        $this->turmaA = $this->naEscola($this->tenant, $this->escolaA, fn (): Turma => Turma::create(['nome' => '6º A', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]));
        $this->turmaB = $this->naEscola($this->tenant, $this->escolaB, fn (): Turma => Turma::create(['nome' => '6º B', 'turno_id' => Turno::create(['nome' => 'Manhã', 'ordem' => 1])->id, 'ano_letivo' => 2026]));
    }

    private function naEscolaHttp(Escola $escola): static
    {
        return $this->como($this->admin, $this->tenant)->withHeader('X-Escola-ID', (string) $escola->id);
    }

    /** @param array<string, mixed> $dados */
    private function cadastrar(Escola $escola, Turma $turma, array $dados): int
    {
        return (int) $this->naEscolaHttp($escola)->postJson('/api/escola/alunos', ['turma_id' => $turma->id, ...$dados])
            ->assertCreated()->json('id');
    }

    /** @return \Illuminate\Support\Collection<int, PessoaVinculo> */
    private function vinculos(): \Illuminate\Support\Collection
    {
        return $this->noTenant($this->tenant, fn () => PessoaVinculo::query()->where('tipo_vinculo', 'aluno')->orderBy('id')->get());
    }

    public function test_aluno_com_cpf_cria_a_pessoa_e_o_vinculo_aluno(): void
    {
        $id = $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => '529.982.247-25', 'mae' => 'Maria Lima', 'cgm' => '123']);

        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::query()->sole());
        $this->assertSame('ANA LIMA', $pessoa->nome);
        $this->assertSame('Maria Lima', $pessoa->nome_mae);

        $vinculo = $this->vinculos()->sole();
        $this->assertNull($vinculo->fim);
        $this->assertSame('123', $vinculo->matricula);
        $this->assertSame(['escola_id' => $this->escolaA->id, 'aluno_id' => $id, 'turma_id' => $this->turmaA->id], $vinculo->dados);

        $this->naEscolaHttp($this->escolaA)->getJson("/api/escola/alunos/{$id}")
            ->assertOk()->assertJsonPath('cpf_mascarado', '***.982.247-**')->assertJsonPath('pessoa_id', $pessoa->id)
            ->assertJsonMissingPath('cpf');
        $this->assertDatabaseMissing('pessoas_usuarios', ['pessoa_id' => $pessoa->id]);
    }

    public function test_mesmo_cpf_em_duas_escolas_e_a_mesma_pessoa(): void
    {
        $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);
        $this->cadastrar($this->escolaB, $this->turmaB, ['nome' => 'Ana L.', 'cpf' => self::CPF]);

        $this->noTenant($this->tenant, fn () => $this->assertSame(1, Pessoa::count()));
        $this->assertCount(2, $this->vinculos());
        // A pessoa já existia: o nome do cadastro mestre prevalece também na escola B.
        $this->assertSame('ANA LIMA', $this->naEscola($this->tenant, $this->escolaB, fn () => Aluno::query()->sole()->nome));
    }

    public function test_nome_corrigido_no_cadastro_de_pessoas_reflete_nas_escolas(): void
    {
        $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);
        $this->cadastrar($this->escolaB, $this->turmaB, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);

        $this->noTenant($this->tenant, fn () => Pessoa::query()->sole()->update(['nome' => 'Ana Lima Souza']));

        $this->naEscolaHttp($this->escolaA)->getJson('/api/escola/alunos')->assertOk()->assertJsonPath('data.0.nome', 'ANA LIMA SOUZA');
        $this->naEscolaHttp($this->escolaB)->getJson('/api/escola/alunos')->assertOk()->assertJsonPath('data.0.nome', 'ANA LIMA SOUZA');
    }

    public function test_editar_nome_de_aluno_ligado_grava_na_pessoa(): void
    {
        $id = $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);

        $this->naEscolaHttp($this->escolaA)->putJson("/api/escola/alunos/{$id}", ['nome' => 'Ana Lima Correa'])->assertOk();

        $this->assertSame('ANA LIMA CORREA', $this->noTenant($this->tenant, fn () => Pessoa::query()->sole()->nome));
    }

    public function test_aluno_sem_cpf_nao_cria_pessoa(): void
    {
        $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Sem Documento']);

        $this->noTenant($this->tenant, fn () => $this->assertSame(0, Pessoa::count()));
        $this->assertCount(0, $this->vinculos());
    }

    public function test_transferencia_encerra_o_vinculo_e_mantem_a_pessoa(): void
    {
        $id = $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);

        $this->naEscolaHttp($this->escolaA)->putJson("/api/escola/alunos/{$id}", ['situacao' => 'transferido'])->assertOk();

        $this->assertNotNull($this->vinculos()->sole()->fim);
        $this->noTenant($this->tenant, fn () => $this->assertSame(1, Pessoa::count()));
    }

    public function test_cpf_repetido_na_mesma_escola_e_cpf_invalido_sao_recusados(): void
    {
        $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);

        $this->naEscolaHttp($this->escolaA)->postJson('/api/escola/alunos', ['turma_id' => $this->turmaA->id, 'nome' => 'Outra', 'cpf' => self::CPF])
            ->assertStatus(422)->assertJsonValidationErrors('cpf');
        $this->naEscolaHttp($this->escolaA)->postJson('/api/escola/alunos', ['turma_id' => $this->turmaA->id, 'nome' => 'Outra', 'cpf' => '111.111.111-11'])
            ->assertStatus(422)->assertJsonValidationErrors('cpf');
    }

    public function test_busca_por_cpf(): void
    {
        $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Ana Lima', 'cpf' => self::CPF]);
        $this->cadastrar($this->escolaA, $this->turmaA, ['nome' => 'Bruno Dias', 'cpf' => self::CPF_2]);

        $this->naEscolaHttp($this->escolaA)->getJson('/api/escola/alunos?busca=111.444.777-35')
            ->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nome', 'BRUNO DIAS');
    }

    public function test_csv_com_cpf_liga_a_pessoa_e_recusa_cpf_invalido(): void
    {
        $csv = "NOME;TURMA;CPF\nAna Lima;6º A;529.982.247-25\nBruno Dias;6º A;111.111.111-11\nCarla Sem Cpf;6º A;\n";
        $enviar = fn () => $this->naEscolaHttp($this->escolaA)->post('/api/escola/alunos/importar', ['arquivo' => UploadedFile::fake()->createWithContent('alunos.csv', $csv)]);

        $enviar()->assertOk()->assertJsonPath('criados', 2)->assertJsonPath('rejeitadas.0.motivo', 'CPF inválido (Bruno Dias).');
        $this->noTenant($this->tenant, fn () => $this->assertSame(1, Pessoa::count()));

        // Reimportar não duplica: o CPF identifica o aluno.
        $enviar()->assertOk()->assertJsonPath('criados', 0)->assertJsonPath('atualizados', 2);
        $this->assertCount(1, $this->vinculos());
    }
}
