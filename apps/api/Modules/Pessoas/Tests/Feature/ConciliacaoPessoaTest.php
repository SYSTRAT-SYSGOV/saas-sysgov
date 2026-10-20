<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Services\ConciliacaoPessoaService;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Modules\Pessoas\Support\RegistroConciliacao;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Spec pessoas/unificacao-dados: "Conciliação das cópias de dados civis com o cadastro central". */
final class ConciliacaoPessoaTest extends PessoasTestCase
{
    private Tenant $tenant;

    private ConciliacaoModuloInterface $modulo;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);

        Schema::create('conc_alunos', function ($t): void {
            $t->id();
            $t->string('nome');
            $t->string('cpf')->nullable();
            $t->date('nascimento')->nullable();
            $t->string('mae')->nullable();
            $t->unsignedBigInteger('pessoa_id')->nullable();
            $t->unsignedBigInteger('responsavel_pessoa_id')->nullable();
        });

        $this->modulo = new class implements ConciliacaoModuloInterface {
            public function modulo(): string { return 'teste'; }

            public function tabela(): string { return 'conc_alunos'; }

            public function registros(): iterable
            {
                foreach (DB::table('conc_alunos')->orderBy('id')->get() as $l) {
                    yield new RegistroConciliacao(
                        (int) $l->id,
                        $l->pessoa_id ? (int) $l->pessoa_id : null,
                        $l->cpf,
                        ['nome' => $l->nome, 'data_nascimento' => $l->nascimento, 'nome_mae' => $l->mae],
                        $l->responsavel_pessoa_id ? (int) $l->responsavel_pessoa_id : null,
                    );
                }
            }

            public function vincular(int $registroId, int $pessoaId): void
            {
                DB::table('conc_alunos')->where('id', $registroId)->update(['pessoa_id' => $pessoaId]);
            }
        };
    }

    /** @param array<string, mixed> $dados */
    private function aluno(array $dados): int
    {
        return (int) DB::table('conc_alunos')->insertGetId($dados);
    }

    private function servico(): ConciliacaoPessoaService
    {
        return app(ConciliacaoPessoaService::class);
    }

    public function test_vincula_por_documento_completa_vazios_e_registra_divergencia_sem_sobrescrever(): void
    {
        $cpf = $this->cpfValido();
        $existente = Pessoa::create(['documento' => $cpf, 'nome' => 'Ana Lima', 'data_nascimento' => '2012-04-04']);
        $id = $this->aluno(['nome' => 'Ana de Lima', 'cpf' => $cpf, 'nascimento' => '2012-04-04', 'mae' => 'Maria Lima']);

        $r = $this->servico()->conciliar($this->modulo);

        $this->assertSame(1, $r['vinculados_por_documento']);
        $this->assertSame(1, $r['divergencias_registradas']);
        $this->assertSame(1, $r['campos_completados']);
        $this->assertSame($existente->id, (int) DB::table('conc_alunos')->where('id', $id)->value('pessoa_id'));
        $this->assertSame('Ana Lima', $existente->fresh()->nome, 'o cadastro mestre não é sobrescrito');
        $this->assertSame('Maria Lima', $existente->fresh()->nome_mae, 'campo vazio é completado');
        $div = PessoaDivergencia::query()->first();
        $this->assertSame(['nome', 'Ana de Lima', 'Ana Lima'], [$div->campo, $div->valor_modulo, $div->valor_mdm]);
    }

    public function test_cria_pessoa_para_cpf_novo_e_pendente_para_quem_nao_tem_cpf(): void
    {
        $this->aluno(['nome' => 'Com CPF Novo', 'cpf' => $this->cpfValido(), 'nascimento' => '2000-01-01']);
        $this->aluno(['nome' => 'Adulto Sem CPF', 'nascimento' => '1980-01-01']);

        $r = $this->servico()->conciliar($this->modulo);

        $this->assertSame(1, $r['vinculados_por_documento']);
        $this->assertSame(1, $r['criadas_pendentes']);
        $this->assertSame(1, Pessoa::query()->comDocumentoPendente()->count());
        $this->assertSame(0, DB::table('conc_alunos')->whereNull('pessoa_id')->count());
    }

    public function test_menor_sem_responsavel_documento_invalido_e_duplicidade_vao_para_o_relatorio_sem_vincular(): void
    {
        Pessoa::create(['nome' => 'Pedro Souza', 'data_nascimento' => '1990-02-02']);
        $menor = $this->aluno(['nome' => 'Criança', 'nascimento' => now()->subYears(7)->toDateString()]);
        $invalido = $this->aluno(['nome' => 'CPF Ruim', 'cpf' => '111.111.111-11', 'nascimento' => '2000-01-01']);
        $duplicado = $this->aluno(['nome' => 'pedro  souza', 'nascimento' => '1990-02-02']);

        $r = $this->servico()->conciliar($this->modulo);

        $this->assertSame([$menor], $r['sem_responsavel']);
        $this->assertSame('documento_invalido', $r['erros'][0]['motivo']);
        $this->assertSame($invalido, $r['erros'][0]['registro_id']);
        $this->assertSame($duplicado, $r['possiveis_duplicidades'][0]['registro_id']);
        $this->assertSame(3, DB::table('conc_alunos')->whereNull('pessoa_id')->count());
    }

    public function test_menor_com_responsavel_vira_pessoa_pendente_ligada_ao_responsavel(): void
    {
        $mae = Pessoa::factory()->create();
        $id = $this->aluno(['nome' => 'Criança', 'nascimento' => now()->subYears(7)->toDateString(), 'responsavel_pessoa_id' => $mae->id]);

        $this->servico()->conciliar($this->modulo);

        $pessoaId = (int) DB::table('conc_alunos')->where('id', $id)->value('pessoa_id');
        $this->assertSame($mae->id, Pessoa::query()->findOrFail($pessoaId)->responsavel_id);
    }

    public function test_dry_run_nao_grava_nada_e_o_relatorio_e_o_mesmo_da_execucao_real(): void
    {
        $this->aluno(['nome' => 'Com CPF Novo', 'cpf' => $this->cpfValido(), 'nascimento' => '2000-01-01']);
        $this->aluno(['nome' => 'Adulto Sem CPF', 'nascimento' => '1980-01-01']);
        $antes = Pessoa::count();

        $simulado = $this->servico()->conciliar($this->modulo, dryRun: true);

        $this->assertSame($antes, Pessoa::count());
        $this->assertSame(2, DB::table('conc_alunos')->whereNull('pessoa_id')->count());
        $this->assertSame(0, DB::table('audit_logs')->where('action', 'pessoa.criada_por_modulo')->count());

        $real = $this->servico()->conciliar($this->modulo);
        $this->assertSame(
            array_diff_key($simulado, ['dry_run' => 1]),
            array_diff_key($real, ['dry_run' => 1]),
        );
    }

    public function test_reexecucao_e_idempotente(): void
    {
        $cpf = $this->cpfValido();
        Pessoa::create(['documento' => $cpf, 'nome' => 'Ana Lima']);
        $this->aluno(['nome' => 'Ana de Lima', 'cpf' => $cpf]);
        $this->aluno(['nome' => 'Adulto Sem CPF', 'nascimento' => '1980-01-01']);

        $this->servico()->conciliar($this->modulo);
        $pessoas = Pessoa::count();
        $divergencias = PessoaDivergencia::count();

        $segunda = $this->servico()->conciliar($this->modulo);

        $this->assertSame($pessoas, Pessoa::count(), 'nenhuma pessoa nova');
        $this->assertSame($divergencias, PessoaDivergencia::count(), 'nenhuma divergência duplicada');
        $this->assertSame(2, $segunda['ja_vinculados']);
        $this->assertSame(0, $segunda['criadas_pendentes'] + $segunda['vinculados_por_documento'] + $segunda['campos_completados']);
    }

    public function test_comando_executa_para_o_modulo_registrado_e_recusa_modulo_desconhecido(): void
    {
        app(ConciliacaoRegistry::class)->registrar($this->modulo);
        $this->aluno(['nome' => 'Adulto Sem CPF', 'nascimento' => '1980-01-01']);

        $this->artisan('pessoas:conciliar', ['modulo' => 'teste', '--tenant' => $this->tenant->slug, '--dry-run' => true])
            ->expectsOutputToContain('DRY-RUN')
            ->assertSuccessful();
        $this->assertSame(0, Pessoa::count());

        $this->artisan('pessoas:conciliar', ['modulo' => 'inexistente'])->assertFailed();
    }
}
