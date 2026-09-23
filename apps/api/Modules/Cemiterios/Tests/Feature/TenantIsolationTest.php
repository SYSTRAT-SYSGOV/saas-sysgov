<?php

declare(strict_types=1);

namespace Modules\Cemiterios\Tests\Feature;

use App\Models\Tenant;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Model;
use LogicException;
use Modules\Cemiterios\Models\Cemiterio;
use Modules\Cemiterios\Models\Concessao;
use Modules\Cemiterios\Models\Empreiteiro;
use Modules\Cemiterios\Models\ProcessoAbandono;
use Modules\Cemiterios\Models\SolicitacaoPortal;
use Modules\Cemiterios\Models\Trasladacao;
use Modules\Cemiterios\Models\Vistoria;
use Modules\Cemiterios\Services\EmpreiteiroService;
use Modules\Cemiterios\Services\GisService;
use Modules\Cemiterios\Services\GuiaService;
use Modules\Cemiterios\Services\OperacaoService;
use Modules\Cemiterios\Services\ParametroService;
use Modules\Cemiterios\Services\PrecoService;
use Modules\Cemiterios\Support\Geo;
use Modules\Cemiterios\Tests\CemiteriosTestCase;

/** spec: privacidade-auditoria › Isolamento por município (tarefa 9.1): todas as tabelas do módulo. */
final class TenantIsolationTest extends CemiteriosTestCase
{
    /** @var array<string, int> ids do tenant A */
    private array $ids = [];

    public function test_tenant_b_nao_le_nenhuma_tabela_do_tenant_a(): void
    {
        [$a, $b] = [$this->criarTenant('tenant-a'), $this->criarTenant('tenant-b')];
        $this->popular($a);

        foreach ($this->modelos() as $modelo) {
            $this->noTenant($a);
            self::assertGreaterThan(0, $modelo::count(), "O cenário deveria popular {$modelo} no tenant A.");
            $idA = $modelo::query()->value('id');

            $this->noTenant($b);
            self::assertSame(0, $modelo::count(), "{$modelo} vazou para o tenant B.");
            self::assertNull($modelo::find($idA), "{$modelo} #{$idA} de A é encontrado em B.");
        }
    }

    public function test_tenant_b_recebe_404_ao_ler_alterar_ou_referenciar_dados_de_a(): void
    {
        [$a, $b] = [$this->criarTenant('tenant-a'), $this->criarTenant('tenant-b')];
        $this->popular($a);
        app(TenantContext::class)->clear();
        $adminB = $this->admin($b);
        $i = $this->ids;

        foreach ([
            "/api/cemiterios/parques/{$i['parque']}", "/api/cemiterios/jazigos/{$i['jazigo']}", "/api/cemiterios/jazigos/{$i['jazigo']}/historico",
            "/api/cemiterios/falecidos/{$i['falecido']}", "/api/cemiterios/falecidos/{$i['falecido']}/dados-restritos",
            "/api/cemiterios/concessoes/{$i['concessao']}", "/api/cemiterios/concessionarios/{$i['titular']}",
            "/api/cemiterios/ordens-servico/{$i['ordem']}", "/api/cemiterios/ordens-servico/{$i['ordem']}/pdf",
            "/api/cemiterios/guias/{$i['guia']}/pdf", "/api/cemiterios/empreiteiros/{$i['empreiteiro']}",
            "/api/cemiterios/processos-abandono/{$i['processo']}",
        ] as $uri) {
            $this->como($adminB, $b)->getJson($uri)->assertNotFound();
        }

        $this->como($adminB, $b)->putJson("/api/cemiterios/parques/{$i['parque']}", ['nome' => 'Invadido'])->assertNotFound();
        $this->como($adminB, $b)->postJson("/api/cemiterios/parques/{$i['parque']}/setores", ['codigo' => 'X', 'tipo_zona' => 'jazigos'])->assertNotFound();
        $this->como($adminB, $b)->postJson('/api/cemiterios/jazigos', ['sector_id' => $i['setor'], 'codigo' => 'X', 'tipo' => 'jazigo', 'capacidade' => 1])->assertNotFound();
        $this->como($adminB, $b)->postJson('/api/cemiterios/exumacoes', ['tipo' => 'ordinaria', 'burial_id' => $i['inumacao']])->assertNotFound();
        $this->como($adminB, $b)->postJson("/api/cemiterios/ordens-servico/{$i['ordem']}/concluir")->assertNotFound();
        $this->como($adminB, $b)->postJson("/api/cemiterios/guias/{$i['guia']}/segunda-via")->assertNotFound();
        $this->como($adminB, $b)->putJson("/api/cemiterios/gis/geometrias/jazigo/{$i['jazigo']}", ['geojson' => ['type' => 'Polygon', 'coordinates' => [[[0, 0], [0, 1], [1, 1], [0, 0]]]]])->assertNotFound();
        $this->como($adminB, $b)->postJson('/api/cemiterios/processos-abandono', ['plot_id' => $i['jazigo']])->assertNotFound();

        $this->noTenant($b);
        $titularB = $this->concessao($this->novoJazigo(2, false))->holder_id;
        app(TenantContext::class)->clear();
        $this->como($adminB, $b)->postJson('/api/cemiterios/concessoes', ['plot_id' => $i['jazigo'], 'holder_id' => $titularB, 'modalidade' => 'perpetua', 'lock_version' => 0])->assertNotFound();

        $this->noTenant($a);
        self::assertSame('Central A', Cemiterio::findOrFail($i['parque'])->nome);
    }

    public function test_nao_cria_registro_sem_tenant(): void
    {
        $this->expectException(LogicException::class);
        Cemiterio::create(['codigo' => 'X', 'nome' => 'Órfão']);
    }

    /** Uma linha em cada tabela do módulo, no tenant informado. */
    private function popular(Tenant $tenant): void
    {
        $this->noTenant($tenant);
        $ref = [-49.27, -25.43];
        app(ParametroService::class)->novaVersao(['portal_habilitado' => true], null);

        $jazigo = $this->novoJazigo(3);
        Cemiterio::whereKey($jazigo->park_id)->update(['nome' => 'Central A']);
        $gis = app(GisService::class);
        $gis->salvar('setor', $jazigo->sector_id, Geo::geojson(Geo::desprojetar([[0, 0], [30, 0], [30, 30], [0, 30]], $ref)));
        $gis->salvar('jazigo', $jazigo->id, Geo::geojson(Geo::desprojetar([[1, 1], [2.2, 1], [2.2, 3.5], [1, 3.5]], $ref)));

        $concessao = Concessao::where('plot_id', $jazigo->id)->firstOrFail();
        $operacoes = app(OperacaoService::class);
        $inumacao = $operacoes->inumar(
            ['nome' => 'Falecido A', 'falecimento' => '2020-01-01', 'certidao_numero' => 'C-A', 'certidao_cartorio' => '1º', 'certidao_arquivo' => 'x.pdf', 'causa_morte' => 'sigilo'],
            ['plot_id' => $jazigo->id, 'sepultado_em' => '2020-01-02'],
        );
        $operacoes->exumarJudicial($inumacao, ['processo' => 'P-1', 'juizo' => 'Vara', 'data_decisao' => '2026-01-01', 'arquivo' => 'm.pdf'], null, null);
        Trasladacao::create(['burial_id' => $inumacao->id, 'plot_origem_id' => $jazigo->id, 'destino_externo' => 'Outra cidade']);

        app(PrecoService::class)->novaVigencia('renovacao', 1000, CarbonImmutable::parse('2026-01-01'));
        app(PrecoService::class)->reajustar(2030, '1.0', 'manual', null);
        $guia = app(GuiaService::class)->emitirParaConcessao($concessao, 'renovacao');
        SolicitacaoPortal::create(['holder_id' => $concessao->holder_id, 'concession_id' => $concessao->id, 'tipo' => 'renovacao', 'mensagem' => 'renovar']);

        $empreiteiro = Empreiteiro::create(['nome' => 'Empreiteira A', 'tipo_doc' => 'cpf', 'documento' => $this->cpfValido()]);
        $empreiteiro->alvaras()->create(['numero' => 'AA', 'validade' => '2030-01-01']);
        $servico = app(EmpreiteiroService::class);
        $servico->emitirObra($empreiteiro->refresh(), ['plot_id' => $jazigo->id, 'descricao' => 'obra', 'comprimento_m' => 2.0, 'largura_m' => 1.0, 'prazo_fim' => '2030-01-01']);
        $servico->penalizar($empreiteiro, ['tipo' => 'advertencia', 'motivo' => 'atraso']);

        $vistoria = Vistoria::create(['plot_id' => $jazigo->id, 'data' => today()->toDateString(), 'estado_conservacao' => 'em_ruina', 'risco' => 'alto']);
        $vistoria->fotos()->create(['arquivo' => 'f.jpg', 'capturada_em' => now()]);
        $processo = ProcessoAbandono::create(['plot_id' => $jazigo->id, 'concession_id' => $concessao->id, 'inspection_id' => $vistoria->id, 'instaurado_em' => today()->toDateString()]);

        $this->ids = [
            'parque' => $jazigo->park_id, 'setor' => $jazigo->sector_id, 'jazigo' => $jazigo->id, 'falecido' => $inumacao->deceased_id,
            'inumacao' => $inumacao->id, 'ordem' => (int) $inumacao->service_order_id, 'concessao' => $concessao->id,
            'titular' => $concessao->holder_id, 'guia' => $guia->id, 'empreiteiro' => $empreiteiro->id, 'processo' => $processo->id,
        ];
    }

    /** @return list<class-string<Model>> */
    private function modelos(): array
    {
        return array_map(
            fn (string $arquivo) => 'Modules\\Cemiterios\\Models\\' . basename($arquivo, '.php'),
            glob(__DIR__ . '/../../Models/*.php') ?: [],
        );
    }
}
