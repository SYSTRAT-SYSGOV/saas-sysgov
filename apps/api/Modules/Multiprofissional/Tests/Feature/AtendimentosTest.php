<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Multiprofissional\Tests\Concerns\CenarioMultiprofissional;
use Modules\Multiprofissional\Tests\TestCase;

final class AtendimentosTest extends TestCase
{
    use CenarioMultiprofissional;
    use RefreshDatabase;

    public function test_atendimento_aparece_no_historico_de_cada_estudante(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla');
        $ana = $this->dado($t, 'ana');
        $bruno = $this->dado($t, 'bruno');

        $this->registrarAtendimento($gestor, $t, $prof, ['alunos' => [$ana->id, $bruno->id]])->assertCreated()
            ->assertJsonPath('data.turno_rotulo', 'Manhã')
            ->assertJsonCount(2, 'data.alunos');

        $this->como($gestor, $t)->getJson("/api/multiprofissional/atendimentos?aluno_id={$ana->id}")->assertOk()->assertJsonCount(1, 'data');
        $this->como($gestor, $t)->getJson("/api/multiprofissional/atendimentos?aluno_id={$bruno->id}")->assertOk()->assertJsonCount(1, 'data');
        $this->como($gestor, $t)->getJson('/api/multiprofissional/indicadores')->assertOk();
    }

    public function test_so_autor_ou_gestao_editam(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $autor = $this->usuario($t, ['multiprofissional_profissional']);
        $outro = $this->usuario($t, ['multiprofissional_profissional']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla');
        $id = $this->registrarAtendimento($autor, $t, $prof)->assertCreated()->assertJsonPath('data.pode_editar', true)->json('data.id');
        $dados = $this->como($autor, $t)->getJson("/api/multiprofissional/atendimentos/{$id}")->json('data');
        $payload = [
            'data_hora' => '2026-10-13 10:00', 'turno' => 'manha', 'escola_id' => $dados['escola']['id'],
            'relato' => 'Alterado', 'alunos' => [$this->dado($t, 'ana')->id], 'profissionais' => [$prof->id], 'tipos' => [$this->dado($t, 'tipo')->id],
        ];

        $this->como($outro, $t)->putJson("/api/multiprofissional/atendimentos/{$id}", $payload)->assertForbidden();
        $this->como($outro, $t)->deleteJson("/api/multiprofissional/atendimentos/{$id}")->assertForbidden();
        $this->como($autor, $t)->putJson("/api/multiprofissional/atendimentos/{$id}", $payload)->assertOk()->assertJsonPath('data.relato', 'Alterado');
        $this->como($gestor, $t)->deleteJson("/api/multiprofissional/atendimentos/{$id}")->assertNoContent();
        $this->como($gestor, $t)->getJson("/api/multiprofissional/atendimentos/{$id}")->assertNotFound();
    }

    public function test_consulta_nao_registra_atendimento(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $consulta = $this->usuario($t, ['multiprofissional_consulta']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla');

        $this->registrarAtendimento($consulta, $t, $prof)->assertForbidden();
    }

    public function test_relato_sigiloso_mascarado_para_quem_nao_participa(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $autor = $this->usuario($t, ['multiprofissional_profissional']);
        $participante = $this->usuario($t, ['multiprofissional_consulta']);
        $alheio = $this->usuario($t, ['multiprofissional_profissional']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla', $participante);

        $id = $this->registrarAtendimento($autor, $t, $prof, ['sigiloso' => true, 'relato' => 'Relato confidencial'])->assertCreated()->json('data.id');

        $this->como($alheio, $t)->getJson('/api/multiprofissional/atendimentos')->assertOk()
            ->assertJsonPath('data.0.sigiloso', true)
            ->assertJsonPath('data.0.relato', null)
            ->assertJsonPath('data.0.relato_visivel', false);
        $this->como($alheio, $t)->getJson("/api/multiprofissional/atendimentos/{$id}")->assertOk()->assertJsonPath('data.relato', null);

        foreach ([$autor, $participante, $gestor] as $quem) {
            $this->como($quem, $t)->getJson("/api/multiprofissional/atendimentos/{$id}")->assertOk()->assertJsonPath('data.relato', 'Relato confidencial');
        }
    }

    public function test_relato_nao_vai_para_a_auditoria(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla');
        $this->registrarAtendimento($gestor, $t, $prof, ['relato' => 'Texto que não pode vazar'])->assertCreated();

        $log = $this->como($gestor, $t)->getJson('/api/multiprofissional/auditoria?acao=atendimento.registrado')->assertOk()->json('data.0');
        self::assertStringNotContainsString('não pode vazar', (string) json_encode($log));
    }

    public function test_listas_respeitam_per_page_e_recusam_valor_acima_do_maximo(): void
    {
        $t = $this->criarTenant();
        $gestor = $this->usuario($t, ['multiprofissional_coordenacao']);
        $prof = $this->profissional($t, $gestor, '52998224725', 'Carla');
        $ana = $this->dado($t, 'ana');
        $bruno = $this->dado($t, 'bruno');
        $this->registrarAtendimento($gestor, $t, $prof, ['alunos' => [$ana->id]])->assertCreated();
        $this->registrarAtendimento($gestor, $t, $prof, ['alunos' => [$bruno->id]])->assertCreated();

        foreach (['atendimentos', 'auditoria'] as $rota) {
            $pagina = $this->como($gestor, $t)->getJson("/api/multiprofissional/{$rota}?per_page=1")->assertOk()->assertJsonCount(1, 'data');
            $this->assertGreaterThanOrEqual(2, $pagina->json('last_page'));
            $this->como($gestor, $t)->getJson("/api/multiprofissional/{$rota}?per_page=500")->assertUnprocessable();
        }
    }
}
