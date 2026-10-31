<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class PainelEAuditoriaTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_painel_vazio(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_consulta']);

        $this->como($g, $t)->getJson('/api/transporte/painel')->assertOk()->assertJsonPath('data.indicadores.rotas_ativas', 0)
            ->assertJsonPath('data.indicadores.ocupacao_media', null)->assertJsonPath('data.rotas', [])->assertJsonPath('data.alertas.data', []);
    }

    public function test_indicadores_ocupacao_media_ponderada_e_ordem_das_rotas(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $escola = $this->criarEscola($t);
        $verde = $this->rotaPronta($t, $g, 10, rota: ['nome' => 'Verde'], escola: $escola);
        $amarela = $this->rotaPronta($t, $g, 2, rota: ['nome' => 'Amarela'], escola: $escola);
        $vermelha = $this->rotaPronta($t, $g, 1, rota: ['nome' => 'Vermelha'], escola: $escola);
        $semVeiculo = $this->criarRota($t, $g, $escola, ['nome' => 'Sem veículo']);
        $n = 0;
        $alocar = function (array $r, int $quantos) use (&$n, $t, $g, $escola): void {
            for ($i = 0; $i < $quantos; $i++) {
                $this->alocar($t, $g, $r['rota'], $r['parada'], $this->criarAluno($t, $escola, 'Aluno ' . ++$n), $i >= 1 && $r['rota'] !== 0 ? ['justificativa_excesso' => 'Reforço'] : [])->assertCreated();
            }
        };
        $alocar($verde, 1);
        $alocar($amarela, 2);
        $alocar($vermelha, 2);

        $r = $this->como($g, $t)->getJson('/api/transporte/painel')->assertOk();

        $r->assertJsonPath('data.indicadores.rotas_ativas', 4)->assertJsonPath('data.indicadores.alunos_transportados', 5)
            ->assertJsonPath('data.indicadores.rotas_superlotadas', 1)->assertJsonPath('data.indicadores.rotas_sem_veiculo', 1)
            ->assertJsonPath('data.indicadores.veiculos_ativos', 3);
        // 5 alocados ÷ 13 lugares (10 + 2 + 1), só rotas com veículo.
        $this->assertEqualsWithDelta(38.5, $r->json('data.indicadores.ocupacao_media'), 0.05);
        $this->assertSame(['Vermelha', 'Sem veículo', 'Amarela', 'Verde'], array_column($r->json('data.rotas'), 'nome'));
        $this->assertSame('vermelho', $r->json('data.rotas.0.ocupacao.faixa'));
        $this->assertSame('rota_sem_veiculo', $r->json('data.rotas.1.pendencia'));
        $this->assertNull($r->json('data.rotas.1.ocupacao.percentual'));
        $this->assertSame($semVeiculo, $r->json('data.rotas.1.id'));
    }

    public function test_alertas_criticos_vem_antes_dos_de_atencao_e_o_painel_filtra_por_ano(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->criarMotorista($t, $g, ['cnh_validade' => now()->addDays(10)->toDateString()]);
        $veiculo = $this->criarVeiculo($t, $g);
        $this->registrarVistoria($t, $g, $veiculo, now()->addDay()->toDateString());
        DB::table('transporte_vistorias')->where('veiculo_id', $veiculo)->update(['validade' => now()->subDays(2)->toDateString()]);
        $escola = $this->criarEscola($t);
        $this->criarRota($t, $g, $escola, ['ano_letivo' => 2025]);

        $r = $this->como($g, $t)->getJson('/api/transporte/painel?ano_letivo=2026')->assertOk();

        $this->assertSame(['critico', 'atencao'], array_column($r->json('data.alertas.data'), 'gravidade'));
        $r->assertJsonPath('data.alertas.resumo.criticos', 1)->assertJsonPath('data.alertas.resumo.atencao', 1)->assertJsonPath('data.indicadores.rotas_ativas', 0);
        $this->como($g, $t)->getJson('/api/transporte/painel?ano_letivo=2025')->assertJsonPath('data.indicadores.rotas_ativas', 1);
    }

    public function test_painel_e_do_tenant_e_exige_permissao_de_leitura(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $this->rotaPronta($a, $gA);
        $semPerfil = $this->usuario($a, []);

        $this->como($gB, $b)->getJson('/api/transporte/painel')->assertJsonPath('data.indicadores.rotas_ativas', 0);
        $this->como($semPerfil, $a)->getJson('/api/transporte/painel')->assertForbidden();
    }

    public function test_auditoria_filtra_por_acao_periodo_e_usuario(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $outro = $this->usuario($t, ['transporte_coordenacao']);
        $x = $this->rotaPronta($t, $g, 1);
        $this->alocar($t, $g, $x['rota'], $x['parada'], $this->criarAluno($t, $x['escola'], 'Ana'))->assertCreated();
        $this->alocar($t, $g, $x['rota'], $x['parada'], $this->criarAluno($t, $x['escola'], 'Beto'), ['justificativa_excesso' => 'Reforço da van'])->assertCreated();
        $this->criarParada($t, $outro);

        $r = $this->como($g, $t)->getJson('/api/transporte/auditoria?acao=alocacao.excesso_autorizado')->assertOk();
        $r->assertJsonCount(1, 'data')->assertJsonPath('data.0.depois.justificativa', 'Reforço da van');

        $hoje = today()->toDateString();
        $this->como($g, $t)->getJson("/api/transporte/auditoria?de={$hoje}&ate={$hoje}&acao=parada.criada")->assertJsonCount(2, 'data');
        $this->como($g, $t)->getJson('/api/transporte/auditoria?ate=' . today()->subDay()->toDateString())->assertJsonCount(0, 'data');
        $this->como($g, $t)->getJson("/api/transporte/auditoria?usuario_id={$outro->id}")->assertJsonCount(1, 'data');
        $nomeOutro = $outro->name;
        $this->como($g, $t)->getJson('/api/transporte/auditoria?usuario=' . urlencode($nomeOutro))->assertJsonCount(1, 'data');
    }

    public function test_auditoria_exige_a_permissao_audit(): void
    {
        $t = $this->criarTenant();
        $operador = $this->usuario($t, ['transporte_operador']);

        $this->como($operador, $t)->getJson('/api/transporte/auditoria')->assertForbidden();
    }
}
