<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos;
use Tests\TestCase;

/**
 * Achado da revisão de autorização: mesmos problemas do ProposicaoControllerTest (anotação
 * `@test` não reconhecida pelo PHPUnit 12, sem RefreshDatabase/autenticação/tenant). O segundo
 * cenário também usava `proposicao_id: 1` fixo, torcendo pra alguma proposição com esse id
 * existir de um teste anterior — substituído por uma proposição de verdade.
 */
final class TramitacaoPoderesTest extends TestCase
{
    use CenarioRequerimentos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $autor;

    private User $tramitador;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->autor = $this->usuario($this->tenant, ['autor_requerimentos'], 'Autor');
        $this->tramitador = $this->usuario($this->tenant, ['tramitador_requerimentos'], 'Tramitador');
    }

    private function criarProposicao(): int
    {
        /** @var TestResponse<\Symfony\Component\HttpFoundation\Response> $response */
        $response = $this->como($this->autor, $this->tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug'    => 'requerimento',
            'ementa'       => 'Teste de tramitação entre Poderes',
            'area_tematica' => 'administracao',
            'poder_origem'  => 'camara',
        ]);
        $response->assertCreated();

        return $response->json('id');
    }

    public function test_encaminha_proposicao_para_outro_poder(): void
    {
        $proposicaoId = $this->criarProposicao();

        $response = $this->como($this->tramitador, $this->tenant)->postJson('/api/requerimentos/tramitacoes-poderes', [
            'proposicao_id' => $proposicaoId,
            'poder_origem'  => 'camara',
            'poder_destino' => 'prefeitura',
            'prazo_dias'    => 15,
            'observacao'    => 'Urgente — prazo regimental reduzido.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('status', 'encaminhado')
            ->assertJsonPath('poder_destino', 'prefeitura');

        $tramitacaoId = $response->json('id');

        $response = $this->como($this->tramitador, $this->tenant)
            ->patchJson("/api/requerimentos/tramitacoes-poderes/{$tramitacaoId}/recebimento");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'recebido');
        $this->assertNotNull($response->json('data_recebimento'));
    }

    public function test_rejeita_tramitacao_com_poderes_iguais(): void
    {
        $proposicaoId = $this->criarProposicao();

        $response = $this->como($this->tramitador, $this->tenant)->postJson('/api/requerimentos/tramitacoes-poderes', [
            'proposicao_id' => $proposicaoId,
            'poder_origem'  => 'camara',
            'poder_destino' => 'camara',
        ]);

        $response->assertStatus(422);
    }

    public function test_quem_nao_tem_permissao_de_tramitar_e_recusado(): void
    {
        $proposicaoId = $this->criarProposicao();

        $this->como($this->autor, $this->tenant)->postJson('/api/requerimentos/tramitacoes-poderes', [
            'proposicao_id' => $proposicaoId,
            'poder_origem'  => 'camara',
            'poder_destino' => 'prefeitura',
        ])->assertForbidden();
    }

    public function test_tramitacao_de_outro_tenant_responde_404(): void
    {
        $proposicaoId = $this->criarProposicao();

        $outroTenant = $this->criarTenant('prefeitura-b');
        $outroTramitador = $this->usuario($outroTenant, ['tramitador_requerimentos'], 'Tramitador B');

        $this->como($outroTramitador, $outroTenant)->postJson('/api/requerimentos/tramitacoes-poderes', [
            'proposicao_id' => $proposicaoId,
            'poder_origem'  => 'camara',
            'poder_destino' => 'prefeitura',
        ])->assertNotFound();
    }
}
