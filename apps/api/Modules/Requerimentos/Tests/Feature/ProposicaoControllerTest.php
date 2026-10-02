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

    private function criarProposicao(User $autor): int
    {
        $response = $this->como($autor, $this->tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug'    => 'requerimento',
            'ementa'       => 'Ementa original',
            'area_tematica' => 'infraestrutura',
            'poder_origem'  => 'camara',
        ]);
        $response->assertCreated();

        return (int) $response->json('id');
    }

    public function test_autor_edita_a_propria_proposicao_protocolada(): void
    {
        $id = $this->criarProposicao($this->autor);

        $this->como($this->autor, $this->tenant)
            ->patchJson("/api/requerimentos/proposicoes/{$id}", [
                'ementa'        => 'Ementa corrigida',
                'justificativa' => 'Justificativa adicionada depois',
            ])
            ->assertOk()
            ->assertJsonPath('ementa', 'Ementa corrigida')
            ->assertJsonPath('justificativa', 'Justificativa adicionada depois');
    }

    public function test_nao_edita_tipo_numero_ou_poder_de_origem(): void
    {
        $id = $this->criarProposicao($this->autor);

        $response = $this->como($this->autor, $this->tenant)->patchJson("/api/requerimentos/proposicoes/{$id}", [
            'ementa' => 'Ementa corrigida',
        ]);

        $response->assertOk();
        $this->assertSame('camara', $response->json('poder_origem'));
        $this->assertStringStartsWith('requerimento/', $response->json('numero'));
    }

    public function test_outro_usuario_nao_edita_proposicao_alheia(): void
    {
        $id = $this->criarProposicao($this->autor);
        $outroAutor = $this->usuario($this->tenant, ['autor_requerimentos'], 'Outro Autor');

        $this->como($outroAutor, $this->tenant)
            ->patchJson("/api/requerimentos/proposicoes/{$id}", ['ementa' => 'Tentativa alheia'])
            ->assertForbidden();
    }

    public function test_tramitador_sem_permissao_de_editar_e_recusado(): void
    {
        $id = $this->criarProposicao($this->autor);
        $tramitador = $this->usuario($this->tenant, ['tramitador_requerimentos'], 'Tramitador');

        $this->como($tramitador, $this->tenant)
            ->patchJson("/api/requerimentos/proposicoes/{$id}", ['ementa' => 'Tentativa do tramitador'])
            ->assertForbidden();
    }

    public function test_proposicao_encaminhada_nao_pode_ser_editada(): void
    {
        $id = $this->criarProposicao($this->autor);
        $tramitador = $this->usuario($this->tenant, ['tramitador_requerimentos'], 'Tramitador');

        $this->como($tramitador, $this->tenant)->postJson('/api/requerimentos/tramitacoes-poderes', [
            'proposicao_id' => $id,
            'poder_origem'  => 'camara',
            'poder_destino' => 'prefeitura',
        ])->assertCreated();

        $this->como($this->autor, $this->tenant)
            ->patchJson("/api/requerimentos/proposicoes/{$id}", ['ementa' => 'Tentativa tardia'])
            ->assertStatus(422);
    }

    public function test_edicao_de_proposicao_de_outro_tenant_responde_404(): void
    {
        $id = $this->criarProposicao($this->autor);

        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroAutor = $this->usuario($outroTenant, ['autor_requerimentos'], 'Autor B');

        $this->como($outroAutor, $outroTenant)
            ->patchJson("/api/requerimentos/proposicoes/{$id}", ['ementa' => 'Tentativa cross-tenant'])
            ->assertNotFound();
    }
}
