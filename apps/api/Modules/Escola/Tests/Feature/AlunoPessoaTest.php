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

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    private function semCpf(array $extra = []): array
    {
        return ['nome' => 'Davi Souza', 'nascimento' => '2016-03-10', ...$extra];
    }

    private function responsavel(string $nome = 'Marta Souza'): Pessoa
    {
        return $this->noTenant($this->tenant, fn () => Pessoa::create(['tipo' => 'fisica', 'documento' => self::CPF_2, 'nome' => $nome]));
    }

    public function test_aluno_sem_cpf_cria_pessoa_pendente_com_responsavel_e_vinculo(): void
    {
        $responsavel = $this->responsavel();

        $id = $this->cadastrar($this->escolaA, $this->turmaA, $this->semCpf(['responsavel_id' => $responsavel->id]));

        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::query()->where('nome', 'DAVI SOUZA')->orWhere('nome', 'Davi Souza')->sole());
        $this->assertTrue($pessoa->documento_pendente);
        $this->assertSame($responsavel->id, $pessoa->responsavel_id);
        $this->assertSame($pessoa->id, $this->noTenant($this->tenant, fn () => Aluno::query()->findOrFail($id)->pessoa_id));
        $this->assertCount(1, $this->vinculos());
    }

    public function test_aluno_menor_sem_cpf_e_sem_responsavel_e_recusado(): void
    {
        $this->naEscolaHttp($this->escolaA)->postJson('/api/escola/alunos', ['turma_id' => $this->turmaA->id, ...$this->semCpf()])
            ->assertStatus(422)->assertJsonPath('code', 'responsavel_obrigatorio');

        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Aluno::query()->count()));
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Pessoa::count()));
    }

    public function test_aluno_sem_cpf_exige_nascimento(): void
    {
        $this->naEscolaHttp($this->escolaA)->postJson('/api/escola/alunos', ['turma_id' => $this->turmaA->id, 'nome' => 'Sem Data'])
            ->assertStatus(422)->assertJsonPath('code', 'dados_insuficientes');
    }

    public function test_pessoa_semelhante_e_sugerida_e_so_cria_com_confirmacao(): void
    {
        $responsavel = $this->responsavel();
        $this->noTenant($this->tenant, fn () => Pessoa::create(['tipo' => 'fisica', 'nome' => 'Davi Souza', 'data_nascimento' => '2016-03-10', 'responsavel_id' => $responsavel->id]));
        $dados = ['turma_id' => $this->turmaA->id, ...$this->semCpf(['responsavel_id' => $responsavel->id])];

        $this->naEscolaHttp($this->escolaA)->postJson('/api/escola/alunos', $dados)
            ->assertStatus(422)->assertJsonPath('code', 'pessoa_semelhante_existente')->assertJsonCount(1, 'sugestoes');

        $this->naEscolaHttp($this->escolaA)->postJson('/api/escola/alunos', [...$dados, 'confirmar_novo' => true])->assertCreated();
        $this->assertSame(3, $this->noTenant($this->tenant, fn () => Pessoa::count()));
    }

    public function test_informar_o_cpf_depois_regulariza_a_mesma_pessoa(): void
    {
        $responsavel = $this->responsavel();
        $id = $this->cadastrar($this->escolaA, $this->turmaA, $this->semCpf(['responsavel_id' => $responsavel->id]));
        $pessoaId = $this->noTenant($this->tenant, fn () => Aluno::query()->findOrFail($id)->pessoa_id);

        $this->naEscolaHttp($this->escolaA)->putJson("/api/escola/alunos/{$id}", ['cpf' => self::CPF])->assertOk();

        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::query()->findOrFail($pessoaId));
        $this->assertFalse($pessoa->documento_pendente);
        $this->assertSame(self::CPF, $pessoa->documento);
        $this->assertSame($pessoaId, $this->noTenant($this->tenant, fn () => Aluno::query()->findOrFail($id)->pessoa_id));
    }

    public function test_editar_nascimento_de_aluno_sem_cpf_grava_na_pessoa(): void
    {
        $responsavel = $this->responsavel();
        $id = $this->cadastrar($this->escolaA, $this->turmaA, $this->semCpf(['responsavel_id' => $responsavel->id]));

        $this->naEscolaHttp($this->escolaA)->putJson("/api/escola/alunos/{$id}", ['nascimento' => '2016-04-11'])->assertOk();

        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::query()->where('responsavel_id', $responsavel->id)->sole());
        $this->assertSame('2016-04-11', $pessoa->data_nascimento->toDateString());
    }

    public function test_csv_sem_cpf_lista_possivel_duplicidade_e_nao_grava_aluno_sem_pessoa(): void
    {
        $responsavel = $this->responsavel();
        $this->noTenant($this->tenant, fn () => Pessoa::create(['tipo' => 'fisica', 'nome' => 'Davi Souza', 'data_nascimento' => '2016-03-10', 'responsavel_id' => $responsavel->id]));
        $csv = "NOME;TURMA;NASCIMENTO\nDavi Souza;6º A;10/03/2016\nEva Sem Data;6º A;\n";
        $enviar = fn (array $extra = []) => $this->naEscolaHttp($this->escolaA)->post('/api/escola/alunos/importar', ['arquivo' => UploadedFile::fake()->createWithContent('alunos.csv', $csv), ...$extra]);

        // Sem pessoa não há aluno (`pessoa_id` é obrigatório): a linha sem nascimento não é gravada.
        $enviar()->assertOk()
            ->assertJsonPath('criados', 0)
            ->assertJsonPath('possiveis_duplicidades.0.linha', 2)
            ->assertJsonPath('sem_pessoa.0.nome', 'Eva Sem Data');

        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Aluno::query()->count()));
    }

    /** @return \Illuminate\Testing\TestResponse<\Symfony\Component\HttpFoundation\Response> */
    private function importarCsv(string $csv): \Illuminate\Testing\TestResponse
    {
        return $this->naEscolaHttp($this->escolaA)->post('/api/escola/alunos/importar', ['arquivo' => UploadedFile::fake()->createWithContent('alunos.csv', $csv)]);
    }

    public function test_csv_de_menor_sem_cpf_usa_o_responsavel_cadastrado_pelo_cpf(): void
    {
        $responsavel = $this->responsavel();

        $this->importarCsv("NOME;TURMA;NASCIMENTO;RESPONSAVEL_CPF\nDavi Souza;6º A;10/03/2016;111.444.777-35\n")
            ->assertOk()->assertJsonPath('criados', 1)->assertJsonPath('sem_pessoa', []);

        $pessoa = $this->noTenant($this->tenant, fn () => Pessoa::query()->where('responsavel_id', $responsavel->id)->sole());
        $this->assertTrue($pessoa->documento_pendente);
        $this->assertSame('2016-03-10', $pessoa->data_nascimento->toDateString());
        $this->assertSame($pessoa->id, $this->noTenant($this->tenant, fn () => Aluno::query()->sole()->pessoa_id));
    }

    public function test_csv_com_responsavel_nao_cadastrado_nao_grava_o_aluno(): void
    {
        $this->importarCsv("NOME;TURMA;NASCIMENTO;RESPONSAVEL_CPF\nDavi Souza;6º A;10/03/2016;529.982.247-25\n")
            ->assertOk()->assertJsonPath('criados', 0)
            ->assertJsonPath('sem_pessoa.0.motivo', 'responsavel_nao_cadastrado');

        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Aluno::query()->count()));
        $this->assertSame(0, $this->noTenant($this->tenant, fn () => Pessoa::query()->count()));
    }

    public function test_csv_com_cpf_de_responsavel_invalido_e_rejeitado(): void
    {
        $this->importarCsv("NOME;TURMA;NASCIMENTO;RESPONSAVEL_CPF\nDavi Souza;6º A;10/03/2016;111.111.111-11\n")
            ->assertOk()->assertJsonPath('criados', 0)
            ->assertJsonPath('rejeitadas.0.motivo', 'CPF do responsável inválido (Davi Souza).');
    }

    public function test_csv_de_menor_sem_cpf_e_sem_responsavel_nao_grava_o_aluno(): void
    {
        $this->importarCsv("NOME;TURMA;NASCIMENTO\nDavi Souza;6º A;10/03/2016\n")
            ->assertOk()->assertJsonPath('criados', 0)
            ->assertJsonPath('sem_pessoa.0.motivo', 'responsavel_obrigatorio');
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

        // Carla não tem CPF nem nascimento: sem pessoa não há aluno, então ela não é gravada.
        $enviar()->assertOk()->assertJsonPath('criados', 1)->assertJsonPath('rejeitadas.0.motivo', 'CPF inválido (Bruno Dias).')
            ->assertJsonPath('sem_pessoa.0.nome', 'Carla Sem Cpf');
        $this->noTenant($this->tenant, fn () => $this->assertSame(1, Pessoa::count()));

        // Reimportar não duplica: o CPF identifica o aluno.
        $enviar()->assertOk()->assertJsonPath('criados', 0)->assertJsonPath('atualizados', 1);
        $this->assertCount(1, $this->vinculos());
    }
}
