<?php

declare(strict_types=1);

namespace Modules\Transporte\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Transporte\Models\ModeloExportacao;
use Modules\Transporte\Tests\Concerns\CenarioTransporte;
use Modules\Transporte\Tests\TestCase;

final class ModelosExportacaoTest extends TestCase
{
    use CenarioTransporte;
    use RefreshDatabase;

    public function test_o_modelo_padrao_existe_e_nao_inclui_campos_sensiveis(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $r = $this->como($g, $t)->getJson('/api/transporte/censo/modelos')->assertOk();

        $r->assertJsonCount(1, 'data')->assertJsonPath('data.0.nome', 'Registro 60 completo')->assertJsonPath('data.0.padrao', true);
        $this->assertNotContains('aluno_cpf', $r->json('data.0.campos'));
        $this->assertContains('transporte_publico', $r->json('data.0.campos'));
    }

    public function test_o_modelo_padrao_nao_e_excluido_nem_alterado(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->getJson('/api/transporte/censo/modelos')->json('data.0.id');

        $this->como($g, $t)->deleteJson("/api/transporte/censo/modelos/{$id}")->assertStatus(409);
        $this->como($g, $t)->putJson("/api/transporte/censo/modelos/{$id}", ['nome' => 'Outro', 'campos' => ['aluno_nome']])->assertStatus(409);
    }

    public function test_salvar_reaplicar_editar_e_excluir(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);

        $id = $this->como($g, $t)->postJson('/api/transporte/censo/modelos', ['nome' => 'Conferência da Secretaria', 'campos' => ['aluno_nome', 'placa']])
            ->assertCreated()->json('data.id');
        $this->como($g, $t)->getJson("/api/transporte/censo/modelos/{$id}/aplicar")->assertOk()->assertJsonPath('data.ignorados', []);
        $campos = $this->como($g, $t)->getJson("/api/transporte/censo/modelos/{$id}/aplicar")->json('data.campos');
        $this->assertContains('placa', $campos);
        $this->assertContains('ano_letivo', $campos);

        $this->como($g, $t)->putJson("/api/transporte/censo/modelos/{$id}", ['nome' => 'Conferência v2', 'campos' => ['aluno_nome']])->assertOk()->assertJsonPath('data.nome', 'Conferência v2');
        $this->como($g, $t)->deleteJson("/api/transporte/censo/modelos/{$id}")->assertOk();
        $this->como($g, $t)->getJson('/api/transporte/censo/modelos')->assertJsonCount(1, 'data');
    }

    public function test_nome_repetido_ou_reservado_e_campo_inexistente_sao_recusados(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $this->como($g, $t)->postJson('/api/transporte/censo/modelos', ['nome' => 'Meu', 'campos' => ['aluno_nome']])->assertCreated();

        $this->como($g, $t)->postJson('/api/transporte/censo/modelos', ['nome' => 'Meu', 'campos' => ['aluno_nome']])->assertStatus(409);
        $this->como($g, $t)->postJson('/api/transporte/censo/modelos', ['nome' => 'Registro 60 completo', 'campos' => ['aluno_nome']])->assertStatus(409);
        $this->como($g, $t)->postJson('/api/transporte/censo/modelos', ['nome' => 'Outro', 'campos' => ['campo_que_nao_existe']])->assertUnprocessable();
    }

    public function test_modelo_com_campos_que_o_leiaute_nao_tem_ignora_e_avisa(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $modelo = ModeloExportacao::create(['tenant_id' => $t->id, 'nome' => 'Antigo', 'leiaute' => 'basico-1', 'campos' => ['aluno_nome', 'campo_de_outro_ano'], 'padrao' => false]);

        $r = $this->como($g, $t)->getJson("/api/transporte/censo/modelos/{$modelo->id}/aplicar")->assertOk();

        $r->assertJsonPath('data.ignorados', ['campo_de_outro_ano']);
        $this->assertContains('aluno_nome', $r->json('data.campos'));
        $this->assertNotContains('campo_de_outro_ano', $r->json('data.campos'));
    }

    public function test_modelo_usado_na_geracao(): void
    {
        $t = $this->criarTenant();
        $g = $this->usuario($t, ['transporte_coordenacao']);
        $id = $this->como($g, $t)->postJson('/api/transporte/censo/modelos', ['nome' => 'Só nome', 'campos' => ['aluno_nome']])->json('data.id');

        $r = $this->como($g, $t)->postJson('/api/transporte/censo/pre-validacao', ['ano_letivo' => 2026, 'modelo_id' => $id])->assertOk();

        $this->assertNotContains('placa', $r->json('data.campos'));
        $this->assertContains('aluno_nome', $r->json('data.campos'));
    }

    public function test_modelo_de_outro_tenant_responde_404(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gA = $this->usuario($a, ['transporte_coordenacao']);
        $gB = $this->usuario($b, ['transporte_coordenacao']);
        $id = $this->como($gA, $a)->postJson('/api/transporte/censo/modelos', ['nome' => 'Da A', 'campos' => ['aluno_nome']])->json('data.id');

        $this->como($gB, $b)->putJson("/api/transporte/censo/modelos/{$id}", ['nome' => 'X', 'campos' => ['aluno_nome']])->assertNotFound();
        $this->como($gB, $b)->deleteJson("/api/transporte/censo/modelos/{$id}")->assertNotFound();
        $this->como($gB, $b)->getJson("/api/transporte/censo/modelos/{$id}/aplicar")->assertNotFound();
        $this->como($gB, $b)->postJson('/api/transporte/censo/pre-validacao', ['ano_letivo' => 2026, 'modelo_id' => $id])->assertUnprocessable();
        $this->como($gB, $b)->getJson('/api/transporte/censo/modelos')->assertJsonCount(1, 'data');
    }
}
