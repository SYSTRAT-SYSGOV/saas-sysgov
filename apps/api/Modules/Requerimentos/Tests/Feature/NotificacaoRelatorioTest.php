<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Requerimentos\Tests\Concerns\CenarioRequerimentos;
use Tests\TestCase;

/**
 * Achado da revisão de autorização: mesmos problemas dos demais testes do módulo (anotação
 * `@test` não reconhecida pelo PHPUnit 12, sem RefreshDatabase/autenticação/tenant). Os
 * relatórios e a auditoria exigem permissões próprias (`requerimentos.relatorios`/`.auditoria`)
 * que o autor comum não tem — usuário de teste trocado pelo administrador do módulo.
 */
final class NotificacaoRelatorioTest extends TestCase
{
    use CenarioRequerimentos;
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant('prefeitura-a');
        $this->admin = $this->usuario($this->tenant, ['admin_requerimentos'], 'Admin');
    }

    public function test_lista_notificacoes_do_usuario(): void
    {
        $response = $this->como($this->admin, $this->tenant)->getJson('/api/requerimentos/notificacoes');

        $response->assertStatus(200)
            ->assertJsonStructure(['data', 'current_page', 'last_page', 'total']);
    }

    public function test_consulta_preferencias_de_notificacao(): void
    {
        $response = $this->como($this->admin, $this->tenant)->getJson('/api/requerimentos/notificacoes/preferencias');

        $response->assertStatus(200)
            ->assertJsonPath('canais', ['email', 'portal']);
    }

    public function test_atualiza_preferencias_de_notificacao(): void
    {
        $response = $this->como($this->admin, $this->tenant)->putJson('/api/requerimentos/notificacoes/preferencias', [
            'canais'        => ['email'],
            'digest_diario' => true,
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('digest_diario', true)
            ->assertJsonPath('canais', ['email']);
    }

    public function test_emite_relatorio_quantitativo(): void
    {
        $response = $this->como($this->admin, $this->tenant)->getJson('/api/requerimentos/relatorios/quantitativo');

        $response->assertStatus(200)
            ->assertJsonStructure([
                'total',
                'por_tipo',
                'por_status',
                'por_area',
                'por_autor',
            ]);
    }

    public function test_emite_relatorio_tempo_medio(): void
    {
        $response = $this->como($this->admin, $this->tenant)->getJson('/api/requerimentos/relatorios/tempo-medio');

        $response->assertStatus(200)
            ->assertJsonStructure(['exercicio', 'por_tipo']);
    }

    public function test_emite_relatorio_cumprimento_prazos(): void
    {
        $response = $this->como($this->admin, $this->tenant)->getJson('/api/requerimentos/relatorios/cumprimento-prazos');

        $response->assertStatus(200)
            ->assertJsonStructure(['exercicio', 'por_tipo']);
    }

    public function test_quem_nao_tem_permissao_de_relatorios_e_recusado(): void
    {
        $autor = $this->usuario($this->tenant, ['autor_requerimentos'], 'Autor');

        $this->como($autor, $this->tenant)->getJson('/api/requerimentos/relatorios/quantitativo')->assertForbidden();
    }

    public function test_lista_tipos_instrumento(): void
    {
        $response = $this->como($this->admin, $this->tenant)->getJson('/api/requerimentos/tipos-instrumento');

        $response->assertStatus(200)
            ->assertJsonCount(8);
    }
}
