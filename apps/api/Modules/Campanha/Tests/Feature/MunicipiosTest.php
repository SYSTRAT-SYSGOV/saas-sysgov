<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use App\Models\AuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Modules\Campanha\Models\Coordenador;
use Modules\Campanha\Models\MunicipioCampanha;
use Modules\Campanha\Models\PrefeitoRelacao;
use Modules\Campanha\Models\Referencia\RefMunicipio;
use Modules\Campanha\Models\Vereador;
use Modules\Campanha\Services\Referencia\ImportadorIbge;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Municípios na campanha, ficha, mapa e painel (grupo 4) e preservação na reimportação (3.4). */
final class MunicipiosTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    private const CURITIBA = 4106902;

    private const LONDRINA = 4113700;

    private const JOINVILLE = 4209102;

    public function test_municipio_sem_dados_da_campanha_aparece_sem_atuacao_e_so_da_uf(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);

        $this->como($this->usuario($tenant), $tenant, $campanha)->getJson('/api/campanha/municipios')->assertOk()
            ->assertJsonCount(3, 'municipios')
            ->assertJsonPath('municipios.0.nome', 'Curitiba')
            ->assertJsonPath('municipios.0.situacao', 'sem_atuacao')
            ->assertJsonPath('municipios.0.meta_votos', 0)
            ->assertJsonPath('municipios.0.coordenador', null)
            ->assertJsonPath('municipios.0.prefeito.nome', 'EDUARDO PIMENTEL')
            ->assertJsonPath('municipios.0.prefeito.vice', 'PAULO MARTINS')
            ->assertJsonPath('municipios.0.prefeito.relacao', 'sem_informacao');
    }

    public function test_alterar_na_ficha_grava_com_auditoria_e_nao_cruza_campanhas(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $a = $this->campanha($tenant, ['nome' => 'A']);
        $b = $this->campanha($tenant, ['nome' => 'B']);
        $coordenacao = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($a, $coordenacao);
        $this->membro($b, $coordenacao);
        $coordenador = $this->naCampanha($a, fn () => Coordenador::create(['nome' => 'Carla Regional', 'tipo' => 'regional']));

        $this->como($coordenacao, $tenant, $a)->putJson('/api/campanha/municipios/' . self::CURITIBA, ['situacao' => 'consolidado', 'meta_votos' => 5000, 'coordenador_id' => $coordenador->id])
            ->assertOk()->assertJsonPath('situacao', 'consolidado')->assertJsonPath('meta_votos', 5000)
            ->assertJsonPath('coordenador.nome', 'Carla Regional')->assertJsonPath('publico.eleitores', 1410995);
        $this->como($coordenacao, $tenant, $a)->getJson('/api/campanha/mapa')->assertOk()
            ->assertJsonPath('municipios.' . self::CURITIBA . '.situacao', 'consolidado')
            ->assertJsonPath('municipios.' . self::CURITIBA . '.coordenador', 'Carla Regional');

        $this->como($coordenacao, $tenant, $b)->getJson('/api/campanha/municipios/' . self::CURITIBA)->assertOk()
            ->assertJsonPath('situacao', 'sem_atuacao')->assertJsonPath('meta_votos', 0);
        $this->assertTrue(AuditLog::query()->where('module', 'campanha')->where('action', 'municipio.atualizado')->exists());
    }

    public function test_municipio_de_outra_uf_coordenador_de_outra_campanha_e_consulta(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $a = $this->campanha($tenant, ['nome' => 'A']);
        $b = $this->campanha($tenant, ['nome' => 'B']);
        $deB = $this->naCampanha($b, fn () => Coordenador::create(['nome' => 'De B', 'tipo' => 'municipal']));
        $gestao = $this->usuario($tenant);

        $this->como($gestao, $tenant, $a)->putJson('/api/campanha/municipios/' . self::JOINVILLE, ['situacao' => 'risco'])
            ->assertStatus(422)->assertJsonPath('error', 'Município não pertence à UF da campanha.');
        $this->como($gestao, $tenant, $a)->putJson('/api/campanha/municipios/' . self::CURITIBA, ['coordenador_id' => $deB->id])
            ->assertStatus(422)->assertJsonPath('error', 'Coordenador não encontrado nesta campanha.');
        $this->como($gestao, $tenant, $a)->putJson('/api/campanha/municipios/' . self::CURITIBA, ['situacao' => 'invalida'])
            ->assertStatus(422)->assertJsonValidationErrors('situacao');

        $consulta = $this->usuario($tenant, ['campanha_consulta']);
        $this->membro($a, $consulta);
        $this->como($consulta, $tenant, $a)->putJson('/api/campanha/municipios/' . self::CURITIBA, ['situacao' => 'risco'])->assertForbidden();
        $this->como($consulta, $tenant, $a)->getJson('/api/campanha/municipios/' . self::CURITIBA)->assertOk();
    }

    public function test_filtros_por_situacao_regiao_coordenador_e_busca_sem_acento(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->como($this->usuario($tenant), $tenant, $campanha);
        $coordenador = $this->naCampanha($campanha, fn () => Coordenador::create(['nome' => 'Norte', 'tipo' => 'regional']));
        $gestao->putJson('/api/campanha/municipios/' . self::LONDRINA, ['situacao' => 'prioritario', 'coordenador_id' => $coordenador->id])->assertOk();

        $gestao->getJson('/api/campanha/municipios?situacao=prioritario')->assertJsonCount(1, 'municipios')->assertJsonPath('municipios.0.nome', 'Londrina');
        $gestao->getJson('/api/campanha/municipios?regiao=Ponta%20Grossa')->assertJsonCount(1, 'municipios');
        $gestao->getJson('/api/campanha/municipios?coordenador_id=' . $coordenador->id)->assertJsonCount(1, 'municipios');
        $gestao->getJson('/api/campanha/municipios?busca=ponta%20gr')->assertJsonCount(1, 'municipios')->assertJsonPath('municipios.0.nome', 'Ponta Grossa');
    }

    public function test_painel_conta_situacoes_aliados_e_regioes(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant, ['meta_votos_global' => 50000]);
        $gestao = $this->como($this->usuario($tenant), $tenant, $campanha);
        $gestao->putJson('/api/campanha/municipios/' . self::CURITIBA, ['situacao' => 'consolidado', 'meta_votos' => 3000])->assertOk();
        $gestao->putJson('/api/campanha/municipios/' . self::LONDRINA, ['situacao' => 'risco', 'meta_votos' => 1000])->assertOk();
        $this->naCampanha($campanha, function (): void {
            PrefeitoRelacao::create(['codigo_ibge' => self::LONDRINA, 'relacao' => 'aliado', 'influencia' => 'alta']);
            Vereador::create(['codigo_ibge' => self::LONDRINA, 'nome' => 'Aliado', 'aliado' => true]);
            Vereador::create(['codigo_ibge' => self::LONDRINA, 'nome' => 'Neutro', 'aliado' => false]);
        });

        $gestao->getJson('/api/campanha/painel')->assertOk()
            ->assertJsonPath('municipios', 3)
            ->assertJsonPath('por_situacao.consolidado', 1)
            ->assertJsonPath('por_situacao.risco', 1)
            ->assertJsonPath('por_situacao.sem_atuacao', 1)
            ->assertJsonPath('prefeitos_aliados', 1)
            ->assertJsonPath('vereadores_aliados', 1)
            ->assertJsonPath('meta_total', 4000)
            ->assertJsonPath('meta_global', 50000)
            ->assertJsonPath('por_regiao.0.regiao', 'Curitiba')
            ->assertJsonPath('por_regiao.0.consolidados', 1);
        $gestao->getJson('/api/campanha/mapa')->assertJsonPath('municipios.' . self::LONDRINA . '.relacao_prefeito', 'aliado')
            ->assertJsonPath('municipios.' . self::CURITIBA . '.relacao_prefeito', 'sem_informacao')
            ->assertJsonPath('municipios.' . self::CURITIBA . '.prefeito', 'EDUARDO PIMENTEL');
    }

    public function test_reimportar_a_base_publica_preserva_os_dados_da_campanha(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $this->como($this->usuario($tenant), $tenant, $campanha)->putJson('/api/campanha/municipios/' . self::CURITIBA, ['situacao' => 'prioritario', 'meta_votos' => 7000])->assertOk();
        Http::fake([
            'servicodados.ibge.gov.br/api/v1/localidades/*' => Http::response([['id' => self::CURITIBA, 'nome' => 'Curitiba', 'microrregiao' => null, 'regiao-imediata' => null]]),
            'apisidra.ibge.gov.br/*' => Http::response([['V' => 'Valor'], ['V' => '1900000', 'D1C' => (string) self::CURITIBA, 'D3N' => '2027']]),
        ]);

        app(ImportadorIbge::class)->municipios('PR');
        app(ImportadorIbge::class)->populacao('PR');

        $this->assertSame(1900000, RefMunicipio::query()->findOrFail(self::CURITIBA)->populacao);
        $this->naCampanha($campanha, function (): void {
            $dados = MunicipioCampanha::query()->where('codigo_ibge', self::CURITIBA)->firstOrFail();
            $this->assertSame('prioritario', $dados->getAttribute('situacao'));
            $this->assertSame(7000, $dados->getAttribute('meta_votos'));
        });
    }
}
