<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Feature;

use App\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

final class FormularioControllerTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
    }

    public function test_chefia_cria_modelo_de_formulario_com_perguntas(): void
    {
        $chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.formularios.manage'], 'Chefia');

        $response = $this->como($chefia, $this->tenant)->postJson('/api/vistoria/formularios', [
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist Agroindústria',
            'perguntas' => [
                ['enunciado' => 'Possui alvará sanitário vigente?', 'tipo' => 'multipla_escolha', 'opcoes' => ['Sim', 'Não'], 'obrigatoria' => true],
                ['enunciado' => 'Foto da fachada', 'tipo' => 'foto', 'obrigatoria' => true],
            ],
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('tipo_fiscalizacao', 'agroindustria')
            ->assertJsonCount(2, 'perguntas');
    }

    public function test_usuario_sem_permissao_e_recusado_ao_criar_modelo(): void
    {
        $semPermissao = $this->usuarioComPermissao($this->tenant, ['vistoria.view'], 'Sem Permissão');

        $response = $this->como($semPermissao, $this->tenant)->postJson('/api/vistoria/formularios', [
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist',
            'perguntas' => [['enunciado' => 'P1', 'tipo' => 'texto_livre']],
        ]);

        $response->assertStatus(403);
    }

    public function test_recusa_tipo_de_pergunta_invalido_com_422(): void
    {
        $chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.formularios.manage'], 'Chefia');

        $response = $this->como($chefia, $this->tenant)->postJson('/api/vistoria/formularios', [
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist',
            'perguntas' => [['enunciado' => 'P1', 'tipo' => 'tipo_inexistente']],
        ]);

        $response->assertStatus(422);
    }

    public function test_lista_modelos_filtrando_por_tipo_de_fiscalizacao(): void
    {
        $chefia = $this->usuarioComPermissao($this->tenant, ['vistoria.view', 'vistoria.formularios.manage'], 'Chefia');

        $this->como($chefia, $this->tenant)->postJson('/api/vistoria/formularios', [
            'tipo_fiscalizacao' => 'agroindustria',
            'nome' => 'Checklist Agroindústria',
            'perguntas' => [['enunciado' => 'P1', 'tipo' => 'texto_livre']],
        ])->assertStatus(201);

        $this->como($chefia, $this->tenant)->postJson('/api/vistoria/formularios', [
            'tipo_fiscalizacao' => 'comercio_insumos',
            'nome' => 'Checklist Comércio',
            'perguntas' => [['enunciado' => 'P1', 'tipo' => 'texto_livre']],
        ])->assertStatus(201);

        $response = $this->como($chefia, $this->tenant)->getJson('/api/vistoria/formularios?tipo_fiscalizacao=agroindustria');

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }
}
