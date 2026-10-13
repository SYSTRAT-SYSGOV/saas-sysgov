<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campanha\Models\Demanda;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Agenda (eventos, reuniões, visitas) e pesquisas eleitorais (Fase 2B, grupo 4). */
final class AgendaPesquisasTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    // ------------------------------------------------------------------ 4.1 agenda

    public function test_visita_vira_demanda_uma_vez(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $g = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);

        $semEncaminhamento = $g()->postJson('/api/campanha/visitas', ['lideranca' => 'Comerciante', 'codigo_ibge' => 4119905, 'data' => '2026-09-20', 'assunto' => 'Apoio'])->assertCreated()->json('id');
        $g()->postJson("/api/campanha/visitas/{$semEncaminhamento}/demanda")->assertStatus(422);

        $id = $g()->postJson('/api/campanha/visitas', [
            'lideranca' => 'Associação de moradores do Jardim', 'codigo_ibge' => 4119905, 'bairro' => 'Uvaranas', 'data' => '2026-09-20',
            'assunto' => 'Pavimentação', 'encaminhamento' => 'Ofício à prefeitura pedindo asfalto na rua 7',
        ])->assertCreated()->json('id');
        $g()->postJson("/api/campanha/visitas/{$id}/demanda")->assertCreated()
            ->assertJsonPath('status', 'pendente')->assertJsonPath('codigo_ibge', 4119905)
            ->assertJsonPath('solicitante', 'Associação de moradores do Jardim')->assertJsonPath('descricao', 'Ofício à prefeitura pedindo asfalto na rua 7');
        $g()->postJson("/api/campanha/visitas/{$id}/demanda")->assertStatus(422)->assertJsonPath('error', 'Esta visita já virou demanda.');
        $this->assertSame(1, $this->naCampanha($campanha, fn () => Demanda::query()->count()));
    }

    public function test_agenda_unificada_proximos_pendencias_e_responsavel(): void
    {
        $this->travelTo('2026-09-10 09:00:00');
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestor = $this->usuario($tenant);
        $naoMembro = $this->usuario($tenant, ['campanha_coordenacao']);
        $g = fn () => $this->como($gestor, $tenant, $campanha);

        $g()->postJson('/api/campanha/eventos', ['nome' => 'Comício', 'codigo_ibge' => 4113700, 'local' => 'Praça', 'inicio' => '2026-09-11 19:00:00', 'responsavel_id' => $naoMembro->id])
            ->assertStatus(422)->assertJsonPath('error', 'O responsável precisa ser membro da campanha ou da coordenação geral.');
        $g()->postJson('/api/campanha/reunioes', ['titulo' => 'Coordenação regional', 'codigo_ibge' => 4106902, 'inicio' => '2026-09-13 10:00:00', 'responsavel_id' => $gestor->id])->assertCreated();
        $g()->postJson('/api/campanha/eventos', ['nome' => 'Comício', 'codigo_ibge' => 4113700, 'local' => 'Praça', 'inicio' => '2026-09-11 19:00:00', 'publico_estimado' => 800])->assertCreated();
        $g()->postJson('/api/campanha/eventos', ['nome' => 'Passado', 'codigo_ibge' => 4113700, 'local' => 'X', 'inicio' => '2026-09-01 19:00:00'])->assertCreated();
        $reuniaoVencida = $g()->postJson('/api/campanha/reunioes', ['titulo' => 'Antiga', 'codigo_ibge' => 4113700, 'inicio' => '2026-09-01 10:00:00', 'pendencias' => 'Enviar material', 'prazo_pendencias' => '2026-09-05'])
            ->assertCreated()->assertJsonPath('pendencia_vencida', true)->json('id');

        $g()->getJson('/api/campanha/agenda/proximos')->assertOk()->assertJsonCount(2, 'itens')
            ->assertJsonPath('itens.0.titulo', 'Comício')->assertJsonPath('itens.0.municipio', 'Londrina')->assertJsonPath('itens.1.tipo', 'reuniao');
        $g()->getJson('/api/campanha/agenda?de=2026-09-01&ate=2026-09-30&tipo=reuniao')->assertJsonCount(2, 'itens')->assertJsonPath('itens.0.alerta', true);
        $g()->getJson('/api/campanha/agenda?codigo_ibge=4106902')->assertJsonCount(1, 'itens');
        $g()->putJson("/api/campanha/reunioes/{$reuniaoVencida}", ['pendencias_resolvidas' => true])->assertOk()->assertJsonPath('pendencia_vencida', false);

        $consulta = $this->usuario($tenant, ['campanha_consulta']);
        $this->membro($campanha, $consulta);
        $this->como($consulta, $tenant, $campanha)->getJson('/api/campanha/agenda')->assertOk();
        $this->como($consulta, $tenant, $campanha)->postJson('/api/campanha/visitas', ['lideranca' => 'X', 'codigo_ibge' => 4113700, 'data' => '2026-09-20', 'assunto' => 'Y'])->assertForbidden();
    }

    // ------------------------------------------------------------------ 4.2 pesquisas

    /**
     * @param list<array<string, mixed>> $resultados
     * @return array<string, mixed>
     */
    private function pesquisa(string $data, array $resultados, ?int $ibge = null): array
    {
        return ['tipo' => 'externa', 'instituto' => 'Instituto Paraná', 'divulgada_em' => $data, 'codigo_ibge' => $ibge, 'margem_erro_decimos' => 25, 'amostra' => 1500, 'resultados' => $resultados];
    }

    public function test_pesquisas_validacoes_e_evolucao(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $g = fn () => $this->como($this->usuario($tenant), $tenant, $campanha);
        $r = fn (int $nosso, int $outro = 300) => [['nome' => 'Nossa candidata', 'percentual_decimos' => $nosso, 'da_campanha' => true], ['nome' => 'Adversário', 'partido' => 'XYZ', 'percentual_decimos' => $outro]];

        $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-08-01', $r(540, 500)))->assertStatus(422)->assertJsonPath('error', 'A soma dos percentuais passa de 100%.');
        $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-08-01', [['nome' => 'A', 'percentual_decimos' => 100, 'da_campanha' => true], ['nome' => 'B', 'percentual_decimos' => 100, 'da_campanha' => true]]))
            ->assertStatus(422)->assertJsonPath('error', 'Marque só um candidato como o da campanha.');
        $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-08-01', [['nome' => 'A', 'percentual_decimos' => 1001]]))->assertStatus(422);

        $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-09-01', $r(110)))->assertCreated();
        $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-08-01', $r(80)))->assertCreated()->assertJsonCount(2, 'resultados');
        $id = $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-09-20', $r(140)))->assertCreated()->json('id');
        $g()->postJson('/api/campanha/pesquisas', $this->pesquisa('2026-09-10', $r(200), 4113700))->assertCreated();

        $g()->getJson('/api/campanha/pesquisas/evolucao')->assertOk()->assertJsonCount(3, 'pontos')
            ->assertJsonPath('pontos.0.percentual_decimos', 80)->assertJsonPath('pontos.1.percentual_decimos', 110)->assertJsonPath('pontos.2.percentual_decimos', 140);
        $g()->getJson('/api/campanha/pesquisas/evolucao?codigo_ibge=4113700')->assertJsonCount(1, 'pontos');

        $g()->putJson("/api/campanha/pesquisas/{$id}", ['resultados' => $r(150, 250)])->assertOk()->assertJsonPath('resultados.0.percentual_decimos', 150)->assertJsonCount(2, 'resultados');
        $g()->getJson('/api/campanha/pesquisas?codigo_ibge=0')->assertJsonCount(3, 'pesquisas');
    }
}
