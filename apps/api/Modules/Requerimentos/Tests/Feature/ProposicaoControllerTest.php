<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos;
use Tests\TestCase;

/**
 * Achado da revisão de autorização: os métodos aqui usavam a anotação `/** @test *\/`, que o
 * PHPUnit 12 (versão deste projeto) não reconhece mais — nenhum rodava de verdade ("No tests
 * found"). Também faltava `RefreshDatabase`, autenticação e tenant (as rotas exigem
 * `auth:sanctum`+`resolve.tenant`+`module-access:requerimentos`), e o tipo de instrumento
 * "requerimento" usado nos testes nunca era semeado.
 */
final class ProposicaoControllerTest extends TestCase
{
    use CenarioRequerimentos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $autor;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->autor = $this->usuario($this->tenant, ['autor_requerimentos'], 'Autor');
    }

    public function test_cria_proposicao_com_dados_validos(): void
    {
        $response = $this->como($this->autor, $this->tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug'    => 'requerimento',
            'ementa'       => 'Solicitação de informações sobre obras na Rua Principal',
            'justificativa' => 'Moradores relatam atraso nas obras.',
            'area_tematica' => 'infraestrutura',
            'poder_origem'  => 'camara',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('numero', 'requerimento/1/' . date('Y'));
    }

    public function test_rejeita_criacao_com_tipo_inativo(): void
    {
        $response = $this->como($this->autor, $this->tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug' => 'tipo_inexistente',
            'ementa'    => 'Teste',
        ]);

        $response->assertStatus(422);
    }

    public function test_quem_nao_tem_permissao_de_criar_e_recusado(): void
    {
        $tramitador = $this->usuario($this->tenant, ['tramitador_requerimentos'], 'Tramitador');

        $this->como($tramitador, $this->tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug' => 'requerimento',
            'ementa'    => 'Teste',
        ])->assertForbidden();
    }

    public function test_lista_proposicoes_publicas(): void
    {
        $response = $this->getJson("/api/publico/requerimentos/{$this->tenant->slug}");

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'last_page', 'total']);
    }
}
