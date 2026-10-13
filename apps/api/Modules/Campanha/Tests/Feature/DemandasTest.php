<?php

declare(strict_types=1);

namespace Modules\Campanha\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Campanha\Models\Eleitor;
use Modules\Campanha\Tests\Concerns\CenarioCampanha;
use Modules\Campanha\Tests\TestCase;

/** Demandas da campanha (Fase 2A, tarefa 3.4). */
final class DemandasTest extends TestCase
{
    use CenarioCampanha;
    use RefreshDatabase;

    public function test_demanda_vinda_do_formulario_nasce_pendente_no_municipio_do_eleitor(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $eleitor = $this->naCampanha($campanha, fn (): Eleitor => Eleitor::create([
            'nome' => 'Ana Souza', 'codigo_ibge' => 4113700, 'bairro' => 'Centro', 'demanda' => 'Posto de saúde no bairro', 'consentimento_versao' => 1, 'consentido_em' => now(),
        ]));
        $coord = $this->usuario($tenant, ['campanha_coordenacao']);
        $this->membro($campanha, $coord);

        $this->como($coord, $tenant, $campanha)->postJson("/api/campanha/eleitores/{$eleitor->id}/demanda", ['categoria' => 'saude', 'responsavel_id' => $coord->id])
            ->assertCreated()->assertJsonPath('status', 'pendente')->assertJsonPath('codigo_ibge', 4113700)
            ->assertJsonPath('solicitante', 'Ana Souza')->assertJsonPath('descricao', 'Posto de saúde no bairro')
            ->assertJsonPath('eleitor_id', $eleitor->id)->assertJsonPath('historico.0.texto', 'Demanda registrada.');

        $consulta = $this->usuario($tenant, ['campanha_consulta']);
        $this->membro($campanha, $consulta);
        $this->como($consulta, $tenant, $campanha)->postJson("/api/campanha/eleitores/{$eleitor->id}/demanda", [])->assertForbidden();
        $this->como($consulta, $tenant, $campanha)->getJson('/api/campanha/demandas')->assertOk()->assertJsonCount(1, 'demandas');
    }

    public function test_responsavel_fora_da_campanha_historico_filtros_e_atrasadas(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $campanha = $this->campanha($tenant);
        $gestao = $this->usuario($tenant);
        $naoMembro = $this->usuario($tenant, ['campanha_coordenacao']);
        $deFora = $this->usuario($this->criarTenant('partido-b'));
        $base = ['codigo_ibge' => 4106902, 'solicitante' => 'Associação de moradores', 'categoria' => 'infraestrutura', 'descricao' => 'Asfalto'];

        $this->como($gestao, $tenant, $campanha)->postJson('/api/campanha/demandas', [...$base, 'responsavel_id' => $naoMembro->id])
            ->assertStatus(422)->assertJsonPath('error', 'O responsável precisa ser membro da campanha ou da coordenação geral.');
        $this->como($gestao, $tenant, $campanha)->postJson('/api/campanha/demandas', [...$base, 'responsavel_id' => $deFora->id])->assertStatus(422);
        $this->como($gestao, $tenant, $campanha)->postJson('/api/campanha/demandas', [...$base, 'codigo_ibge' => 4209102])->assertStatus(422);

        $id = $this->como($gestao, $tenant, $campanha)->postJson('/api/campanha/demandas', [...$base, 'responsavel_id' => $gestao->id, 'prazo' => now()->subDay()->toDateString(), 'prioridade' => 'alta'])
            ->assertCreated()->assertJsonPath('atrasada', true)->json('id');
        $this->como($gestao, $tenant, $campanha)->postJson('/api/campanha/demandas', [...$base, 'prioridade' => 'baixa'])->assertCreated()->assertJsonPath('atrasada', false);

        $this->como($gestao, $tenant, $campanha)->getJson('/api/campanha/demandas?atrasadas=1')->assertJsonCount(1, 'demandas');
        $this->como($gestao, $tenant, $campanha)->getJson('/api/campanha/demandas?prioridade=baixa')->assertJsonCount(1, 'demandas');
        $this->como($gestao, $tenant, $campanha)->getJson("/api/campanha/demandas?responsavel_id={$gestao->id}")->assertJsonCount(1, 'demandas');

        $this->como($gestao, $tenant, $campanha)->putJson("/api/campanha/demandas/{$id}", ['status' => 'concluida', 'comentario' => 'Obra entregue'])->assertOk()
            ->assertJsonPath('atrasada', false)->assertJsonPath('historico.1.texto', 'Situação: Concluída.')->assertJsonPath('historico.2.texto', 'Obra entregue');
        $this->como($gestao, $tenant, $campanha)->getJson('/api/campanha/demandas/responsaveis')->assertOk()
            ->assertJsonFragment(['id' => $gestao->id])->assertJsonMissing(['id' => $naoMembro->id]);
    }

    public function test_isolamento_entre_campanhas(): void
    {
        $this->basePublica();
        $tenant = $this->criarTenant();
        $a = $this->campanha($tenant);
        $b = $this->campanha($tenant, ['nome' => 'Outra']);
        $gestao = $this->usuario($tenant);
        $id = $this->como($gestao, $tenant, $a)->postJson('/api/campanha/demandas', ['codigo_ibge' => 4106902, 'solicitante' => 'X', 'categoria' => 'outra', 'descricao' => 'Y'])->json('id');

        $this->como($gestao, $tenant, $b)->getJson('/api/campanha/demandas')->assertJsonCount(0, 'demandas');
        $this->como($gestao, $tenant, $b)->putJson("/api/campanha/demandas/{$id}", ['status' => 'concluida'])->assertNotFound();
    }
}
