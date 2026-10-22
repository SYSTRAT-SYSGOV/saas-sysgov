<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Contracts\ConciliacaoModuloInterface;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Modules\Pessoas\Services\TravaRemocaoColunasService;
use Modules\Pessoas\Support\RegistroConciliacao;
use Modules\Pessoas\Support\RegraNegocioException;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Spec pessoas/unificacao-dados: "Relatório de adoção por módulo" e "Remoção das colunas duplicadas somente após conciliação validada". */
final class AdocaoETravaRemocaoTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);

        Schema::create('adocao_registros', function ($t): void {
            $t->id();
            $t->string('nome');
            $t->unsignedBigInteger('pessoa_id')->nullable();
        });

        app(ConciliacaoRegistry::class)->registrar(new class implements ConciliacaoModuloInterface {
            public function modulo(): string { return 'teste'; }

            public function tabela(): string { return 'adocao_registros'; }

            public function registros(): iterable
            {
                foreach (DB::table('adocao_registros')->get() as $l) {
                    yield new RegistroConciliacao((int) $l->id, $l->pessoa_id ? (int) $l->pessoa_id : null, null, ['nome' => $l->nome]);
                }
            }

            public function vincular(int $registroId, int $pessoaId): void
            {
                DB::table('adocao_registros')->where('id', $registroId)->update(['pessoa_id' => $pessoaId]);
            }
        });
    }

    private function revisor(): static
    {
        return $this->como($this->usuario($this->tenant, ['cadastros.pessoas.divergencias.manage']), $this->tenant);
    }

    public function test_relatorio_traz_apenas_totais_por_modulo(): void
    {
        $comCpf = Pessoa::factory()->create();
        $pendente = Pessoa::create(['nome' => 'Pendente', 'data_nascimento' => '1990-01-01']);
        DB::table('adocao_registros')->insert([
            ['nome' => 'A', 'pessoa_id' => $comCpf->id], ['nome' => 'B', 'pessoa_id' => $pendente->id], ['nome' => 'C', 'pessoa_id' => null],
        ]);
        PessoaDivergencia::create(['pessoa_id' => $comCpf->id, 'modulo' => 'teste', 'tabela' => 'adocao_registros', 'registro_id' => 1, 'campo' => 'nome', 'valor_modulo' => 'x', 'valor_mdm' => 'y']);

        $resposta = $this->revisor()->getJson('/api/pessoas/adocao')->assertOk();

        // Os módulos reais (ex.: escola) também estão registrados: procura o de teste pelo alias.
        $this->assertSame([
            'modulo' => 'teste', 'tabela' => 'adocao_registros', 'total' => 3, 'vinculados' => 2,
            'sem_vinculo' => 1, 'documento_pendente' => 1, 'divergencias_abertas' => 1,
        ], array_values(array_filter(
            (array) $resposta->json('modulos'),
            fn (array $m): bool => $m['modulo'] === 'teste',
        ))[0]);
        $resposta->assertJsonPath('totais.total', 3);
        $this->assertStringNotContainsString('Pendente', $resposta->getContent(), 'sem dado civil individual');
    }

    public function test_relatorio_exige_permissao(): void
    {
        $this->como($this->usuario($this->tenant, []), $this->tenant)->getJson('/api/pessoas/adocao')->assertForbidden();
    }

    public function test_remocao_bloqueada_com_registro_sem_pessoa_ou_divergencia_aberta(): void
    {
        DB::table('adocao_registros')->insert(['nome' => 'Sem pessoa', 'pessoa_id' => null]);

        $trava = app(TravaRemocaoColunasService::class);
        $this->assertFalse($trava->liberada('teste'));
        $this->assertStringContainsString('sem pessoa vinculada', implode(' ', $trava->motivos('teste')));

        $this->expectException(RegraNegocioException::class);
        $trava->exigir('teste');
    }

    public function test_remocao_bloqueada_com_divergencia_aberta_mesmo_com_tudo_vinculado(): void
    {
        $pessoa = Pessoa::factory()->create();
        DB::table('adocao_registros')->insert(['nome' => 'A', 'pessoa_id' => $pessoa->id]);
        PessoaDivergencia::create(['pessoa_id' => $pessoa->id, 'modulo' => 'teste', 'tabela' => 'adocao_registros', 'registro_id' => 1, 'campo' => 'nome', 'valor_modulo' => 'x', 'valor_mdm' => 'y']);

        $this->assertStringContainsString('divergência', implode(' ', app(TravaRemocaoColunasService::class)->motivos('teste')));
    }

    public function test_remocao_liberada_quando_tudo_conciliado(): void
    {
        $pessoa = Pessoa::factory()->create();
        DB::table('adocao_registros')->insert(['nome' => 'A', 'pessoa_id' => $pessoa->id]);

        $trava = app(TravaRemocaoColunasService::class);
        $this->assertTrue($trava->liberada('teste'));
        $trava->exigir('teste');
        $this->addToAssertionCount(1);
    }

    public function test_modulo_sem_conciliacao_registrada_nao_e_liberado(): void
    {
        $this->assertFalse(app(TravaRemocaoColunasService::class)->liberada('modulo-fantasma'));
    }
}
