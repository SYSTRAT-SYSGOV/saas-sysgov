<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Modules\Pessoas\Events\PessoaAtualizada;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\AtualizacaoCivilPessoaService;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Spec pessoas/mdm-consumo: "Edição de dado civil a partir do módulo" grava no cadastro central. */
final class AtualizacaoCivilPessoaTest extends PessoasTestCase
{
    private AtualizacaoCivilPessoaService $servico;

    protected function setUp(): void
    {
        parent::setUp();
        $this->noTenant($this->criarTenant());
        $this->servico = app(AtualizacaoCivilPessoaService::class);
    }

    public function test_alteracao_do_modulo_grava_na_pessoa_e_audita_a_origem_sem_valores(): void
    {
        $pessoa = Pessoa::factory()->create(['data_nascimento' => '2015-01-01', 'nome_mae' => 'Mãe Original']);

        $this->servico->atualizar($pessoa, ['data_nascimento' => '2015-02-02', 'nome_mae' => 'Mãe Corrigida'], 'escola');

        $pessoa->refresh();
        $this->assertSame('2015-02-02', $pessoa->data_nascimento?->format('Y-m-d'));
        $this->assertSame('Mãe Corrigida', $pessoa->nome_mae);

        $registro = DB::table('audit_logs')->where('action', 'pessoa.atualizada_por_modulo')->first();
        $this->assertNotNull($registro);
        $this->assertStringContainsString('escola', json_encode($registro));
        $this->assertStringNotContainsString('Mãe Corrigida', json_encode($registro), 'a auditoria não guarda os valores civis');
    }

    public function test_dispara_o_evento_para_os_demais_modulos(): void
    {
        Event::fake([PessoaAtualizada::class]);
        $pessoa = Pessoa::factory()->create();

        $this->servico->atualizar($pessoa, ['nome_social' => 'Nome Social Novo'], 'cursos');

        Event::assertDispatched(PessoaAtualizada::class, fn (PessoaAtualizada $e): bool => $e->pessoaId === $pessoa->id && in_array('nome_social', $e->camposAlterados, true));
    }

    public function test_nunca_apaga_o_nome(): void
    {
        $pessoa = Pessoa::factory()->create(['nome' => 'Nome Mestre']);

        $this->servico->atualizar($pessoa, ['nome' => '  '], 'escola');

        $this->assertSame('Nome Mestre', $pessoa->fresh()->nome);
    }

    public function test_campos_que_nao_sao_civis_sao_ignorados(): void
    {
        $pessoa = Pessoa::factory()->create();
        $documento = $pessoa->documento;

        $this->servico->atualizar($pessoa, ['documento' => $this->cpfValido(), 'status' => 'inativo', 'tenant_id' => 999], 'escola');

        $pessoa->refresh();
        $this->assertSame($documento, $pessoa->documento);
        $this->assertSame('ativo', $pessoa->status);
    }

    public function test_sem_mudanca_real_nao_audita(): void
    {
        $pessoa = Pessoa::factory()->create(['nome' => 'Igual']);

        $this->servico->atualizar($pessoa, ['nome' => 'Igual'], 'escola');

        $this->assertSame(0, DB::table('audit_logs')->where('action', 'pessoa.atualizada_por_modulo')->count());
    }
}
