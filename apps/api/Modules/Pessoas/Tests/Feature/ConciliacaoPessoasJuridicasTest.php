<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Illuminate\Support\Facades\DB;
use Modules\Cursos\Models\Empresa;
use Modules\Cursos\Services\EmpresaService;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\ConciliacaoPessoaService;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Modules\Pessoas\Tests\PessoasTestCase;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoParticipante;

/** Fase 4: empresas e fornecedores (pessoa jurídica) conciliam com o cadastro central pelo CNPJ. */
final class ConciliacaoPessoasJuridicasTest extends PessoasTestCase
{
    private const CNPJ = '11222333000181';

    private const CNPJ_2 = '45723174000110';

    protected function setUp(): void
    {
        parent::setUp();
        $this->noTenant($this->criarTenant());
    }

    /** @return array<string, mixed> */
    private function conciliar(string $alias, bool $dryRun = false): array
    {
        return app(ConciliacaoPessoaService::class)->conciliar(app(ConciliacaoRegistry::class)->obter($alias), $dryRun);
    }

    private function licitacao(string $status = 'homologada'): Licitacao
    {
        return Licitacao::create([
            'numero' => 'PE 001/2026', 'ano' => 2026, 'modalidade' => 'pregao_eletronico', 'objeto' => 'Material',
            'criterio_julgamento' => 'menor_preco', 'regime_execucao' => 'global', 'status' => $status,
        ]);
    }

    public function test_cnpj_existente_vincula_e_ausente_gera_a_pessoa_juridica_sem_alterar_a_licitacao_homologada(): void
    {
        $existente = Pessoa::create(['tipo' => 'juridica', 'documento' => self::CNPJ, 'razao_social' => 'Alfa Ltda']);
        $licitacao = $this->licitacao();
        $a = LicitacaoParticipante::create(['licitacao_id' => $licitacao->id, 'razao_social' => 'Alfa Ltda', 'cnpj' => self::CNPJ, 'status' => 'vencedor']);
        $b = LicitacaoParticipante::create(['licitacao_id' => $licitacao->id, 'razao_social' => 'Beta SA', 'cnpj' => self::CNPJ_2, 'status' => 'habilitado']);
        $c = LicitacaoParticipante::create(['licitacao_id' => $licitacao->id, 'razao_social' => 'Gama', 'cnpj' => '12345678000100', 'status' => 'inabilitado']);
        $antes = DB::table('licitacao_participantes')->get(['razao_social', 'cnpj', 'status'])->toArray();

        $dry = $this->conciliar('procurement-participantes', true);
        $this->assertNull($a->fresh()->pessoa_id);
        $real = $this->conciliar('procurement-participantes');

        $this->assertSame($dry['vinculados_por_documento'], $real['vinculados_por_documento']);
        $this->assertSame(2, $real['vinculados_por_documento']);
        $this->assertSame($existente->id, $a->fresh()->pessoa_id);
        $this->assertSame('juridica', Pessoa::findOrFail($b->fresh()->pessoa_id)->tipo);
        // CNPJ inválido não gera pessoa: vai para as ocorrências do relatório.
        $this->assertNull($c->fresh()->pessoa_id);
        $this->assertSame([['registro_id' => $c->id, 'motivo' => 'documento_invalido']], $real['erros']);
        $this->assertSame(2, Pessoa::count());
        // Só o vínculo é acrescentado: os dados registrados na homologação ficam idênticos.
        $this->assertEquals($antes, DB::table('licitacao_participantes')->get(['razao_social', 'cnpj', 'status'])->toArray());
        $this->assertSame('homologada', $licitacao->fresh()?->getAttribute('status'));

        $this->assertSame(0, $this->conciliar('procurement-participantes')['vinculados_por_documento']);
    }

    public function test_empresa_de_cursos_nova_liga_a_pessoa_juridica_no_cadastro(): void
    {
        $empresa = app(EmpresaService::class)->criar(['razao_social' => 'Delta Treinamentos', 'cnpj' => self::CNPJ]);

        $this->assertNotNull($empresa->fresh()->pessoa_id);
        $this->assertSame('juridica', Pessoa::findOrFail($empresa->pessoa_id)->tipo);

        $semCnpj = app(EmpresaService::class)->criar(['razao_social' => 'Sem Documento']);
        $this->assertNull($semCnpj->fresh()->pessoa_id);
        $this->assertSame(1, Pessoa::count());
    }

    public function test_empresas_existentes_de_cursos_sao_conciliadas(): void
    {
        $empresa = Empresa::create(['razao_social' => 'Épsilon', 'nome_fantasia' => 'Eps', 'cnpj' => self::CNPJ_2]);

        $this->conciliar('cursos-empresas');

        $pessoa = Pessoa::findOrFail($empresa->fresh()->pessoa_id);
        $this->assertSame('Épsilon', $pessoa->nome);
        $this->assertSame('Eps', $pessoa->nome_fantasia);
    }
}
