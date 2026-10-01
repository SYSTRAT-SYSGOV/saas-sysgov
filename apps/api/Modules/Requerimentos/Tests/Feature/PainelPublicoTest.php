<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos;
use Tests\TestCase;

/**
 * Achado de segurança: antes desta correção, `PainelPublicoController` não tinha nenhum conceito
 * de tenant na URL/middleware — `Proposicao::publica()` rodava sem `TenantContext`, e como o
 * escopo global do `TenantAware` só filtra quando há um tenant definido, a consulta pública
 * misturava proposições de TODOS os órgãos. Corrigido com `{orgao}` no endereço (mesmo desenho
 * do painel público de Cursos) + `ResolvePublicTenant`.
 */
final class PainelPublicoTest extends TestCase
{
    use CenarioRequerimentos;
    use RefreshDatabase;

    private Tenant $tenantA;

    private Tenant $tenantB;

    private User $autorA;

    private function criarProposicao(User $autor, Tenant $tenant, string $ementa): int
    {
        $response = $this->como($autor, $tenant)->postJson('/api/requerimentos/proposicoes', [
            'tipo_slug'    => 'requerimento',
            'ementa'       => $ementa,
            'area_tematica' => 'administracao',
            'poder_origem'  => 'camara',
        ]);
        $response->assertCreated();

        return $response->json('id');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenantA = $this->criarTenant('prefeitura-a');
        $this->tenantB = $this->criarTenant('prefeitura-b');
        $this->autorA = $this->usuario($this->tenantA, ['autor_requerimentos'], 'Autor A');
    }

    public function test_painel_publico_de_um_orgao_nao_mostra_proposicoes_de_outro(): void
    {
        $this->criarProposicao($this->autorA, $this->tenantA, 'Proposição exclusiva da Prefeitura A');

        $response = $this->getJson("/api/publico/requerimentos/{$this->tenantB->slug}");

        $response->assertStatus(200)->assertJsonCount(0, 'data');
    }

    public function test_painel_publico_mostra_apenas_proposicoes_do_proprio_orgao(): void
    {
        $this->criarProposicao($this->autorA, $this->tenantA, 'Proposição da Prefeitura A');

        $response = $this->getJson("/api/publico/requerimentos/{$this->tenantA->slug}");

        $response->assertStatus(200)->assertJsonCount(1, 'data');
    }

    public function test_detalhe_publico_de_outro_tenant_responde_404(): void
    {
        $id = $this->criarProposicao($this->autorA, $this->tenantA, 'Proposição da Prefeitura A');

        $this->getJson("/api/publico/requerimentos/{$this->tenantB->slug}/{$id}")->assertNotFound();
    }

    public function test_orgao_inexistente_responde_404(): void
    {
        $this->getJson('/api/publico/requerimentos/orgao-que-nao-existe')->assertNotFound();
    }

    public function test_orgao_sem_modulo_habilitado_responde_404(): void
    {
        $semModulo = $this->criarTenant('prefeitura-c', comModulo: false);

        $this->getJson("/api/publico/requerimentos/{$semModulo->slug}")->assertNotFound();
    }

    public function test_orgao_inativo_responde_404(): void
    {
        $this->tenantA->update(['status' => 'suspended']);

        $this->getJson("/api/publico/requerimentos/{$this->tenantA->slug}")->assertNotFound();
    }
}
