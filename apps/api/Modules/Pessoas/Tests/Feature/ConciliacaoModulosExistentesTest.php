<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use Modules\Campanha\Models\Campanha;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Support\CampanhaContext;
use Modules\Cemiterios\Models\Falecido;
use Modules\Cemiterios\Models\OperadorCemiterio;
use Modules\Cursos\Models\Participante;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaDivergencia;
use Modules\Pessoas\Services\ConciliacaoPessoaService;
use Modules\Pessoas\Services\ConciliacaoRegistry;
use Modules\Pessoas\Tests\PessoasTestCase;

/** Fase 3: Cemitérios, Campanha e Cursos conciliam o que já tinham de cópia com o cadastro central. */
final class ConciliacaoModulosExistentesTest extends PessoasTestCase
{
    private const CPF = '52998224725';

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

    public function test_os_modulos_das_fases_registram_a_conciliacao(): void
    {
        $esperados = [
            'campanha-cabos', 'campanha-coordenadores', 'capd', 'cemiterios-concessionarios', 'cemiterios-falecidos', 'cemiterios-herdeiros',
            'cemiterios-operadores', 'cursos', 'cursos-empresas', 'escola', 'inservivel-entidades', 'passeio-veiculos', 'procurement-participantes',
        ];
        $this->assertSame($esperados, app(ConciliacaoRegistry::class)->aliases());
    }

    public function test_cursos_participante_com_cpf_vincula_e_sem_documento_vira_pendente(): void
    {
        $existente = Pessoa::create(['tipo' => 'fisica', 'documento' => self::CPF, 'nome' => 'Ana Lima']);
        $comCpf = Participante::create(['nome' => 'Ana Lima', 'email' => 'ana@x.gov.br', 'documento' => self::CPF]);
        $semDoc = Participante::create(['nome' => 'Bruno Externo', 'email' => 'bruno@x.gov.br']);

        $dry = $this->conciliar('cursos', true);
        $this->assertNull($comCpf->fresh()->pessoa_id);
        $real = $this->conciliar('cursos');

        $this->assertSame($dry['vinculados_por_documento'], $real['vinculados_por_documento']);
        $this->assertSame($existente->id, $comCpf->fresh()->pessoa_id);
        $this->assertTrue(Pessoa::findOrFail($semDoc->fresh()->pessoa_id)->documento_pendente);
        $this->assertSame(2, Pessoa::count());

        $this->assertSame(0, $this->conciliar('cursos')['criadas_pendentes']);
    }

    public function test_cemiterios_operador_e_falecido_sem_alterar_a_situacao_registrada(): void
    {
        $operador = OperadorCemiterio::create(['nome' => 'José Coveiro', 'tipo' => 'coveiro', 'cpf_cnpj' => self::CPF, 'situacao' => 'ativo']);
        $falecido = Falecido::create(['nome' => 'Maria Antiga', 'nascimento' => '1940-05-01', 'falecimento' => '2020-03-10', 'certidao_numero' => 'C-1']);

        $this->conciliar('cemiterios-operadores');
        $relatorio = $this->conciliar('cemiterios-falecidos');

        $this->assertSame(1, $relatorio['criadas_pendentes']);
        $this->assertNotNull($operador->fresh()->pessoa_id);
        $this->assertSame($falecido->fresh()->pessoa_id, Pessoa::query()->where('documento_pendente', true)->sole()->id);
        $this->assertSame('ativo', $operador->fresh()->situacao);
        $this->assertSame('2020-03-10', $falecido->fresh()->falecimento->toDateString());
    }

    public function test_campanha_coordenador_sem_pessoa_e_vinculado_e_divergencia_nao_sobrescreve(): void
    {
        $campanha = Campanha::create(['nome' => 'Deputado 2026', 'ano' => 2026, 'cargo' => 'Deputado Estadual', 'uf' => 'PR']);
        app(CampanhaContext::class)->set($campanha);
        $coordenador = Coordenador::create(['nome' => 'Carla Regional', 'tipo' => 'regional']);
        app(CampanhaContext::class)->clear();

        // Sem contexto de campanha (comando em lote), a conciliação enxerga todas as campanhas do tenant.
        $relatorio = $this->conciliar('campanha-coordenadores');

        $this->assertSame(1, $relatorio['criadas_pendentes']);
        $this->assertNotNull(Coordenador::withoutGlobalScope('campanha')->findOrFail($coordenador->id)->pessoa_id);
        $this->assertSame(0, PessoaDivergencia::count());
    }
}
