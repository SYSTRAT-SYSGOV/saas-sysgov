<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Quinquenio;
use Modules\Capd\Models\Servidor;
use Modules\Capd\Services\QuinquenioService;
use Tests\TestCase;

/**
 * RN-08 (art. 17, Lei 1.704/2006) — Quinquênios persistidos, segregados
 * das notas de desempenho.
 */
final class QuinquenioTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private Servidor $servidor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Quinquenio',
            'slug'   => 'pref-quinquenio',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create([
            'name'     => 'Comissao Quinquenio',
            'email'    => 'comissao.quinquenio@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Servidor Quinquenio', 'email' => 'servidor.quinquenio@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        // Admissão há ~11 anos a partir de hoje => 2 quinquênios completos
        $this->servidor = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $servidorUser->id,
            'matricula'             => 'MAT-700',
            'cpf'                   => '22233344455',
            'nome_completo'         => 'Servidor Quinquenio',
            'data_nascimento'       => '1980-05-15',
            'data_admissao'         => now()->subYears(11)->toDateString(),
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Contador',
            'orgao_lotacao'         => 'Secretaria de Finanças',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function headers(): array
    {
        return ['X-Tenant-ID' => (string) $this->tenant->id];
    }

    public function test_gerar_pendentes_cria_quinquenios_completos_desde_a_admissao(): void
    {
        $gerados = app(QuinquenioService::class)->gerarPendentes($this->servidor);

        $this->assertCount(2, $gerados);
        $this->assertSame(2, Quinquenio::where('servidor_id', $this->servidor->id)->count());
    }

    public function test_gerar_pendentes_e_idempotente(): void
    {
        app(QuinquenioService::class)->gerarPendentes($this->servidor);
        $segundaChamada = app(QuinquenioService::class)->gerarPendentes($this->servidor);

        $this->assertCount(0, $segundaChamada);
        $this->assertSame(2, Quinquenio::where('servidor_id', $this->servidor->id)->count());
    }

    public function test_endpoint_gera_e_lista_quinquenios_com_total(): void
    {
        $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->postJson("/api/capd/servidores/{$this->servidor->id}/quinquenios/gerar")
            ->assertStatus(200);

        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->getJson("/api/capd/servidores/{$this->servidor->id}/quinquenios");

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertSame(2, $data['total']);
        $this->assertSame('10.00', $data['percentual_total']);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_listar_quinquenios(): void
    {
        $semPermissao = User::create([
            'name'     => 'Servidor Comum Quinquenio',
            'email'    => 'servidor.comum.quinquenio@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $response = $this->actingAs($semPermissao)
            ->withHeaders($this->headers())
            ->getJson("/api/capd/servidores/{$this->servidor->id}/quinquenios");

        $response->assertStatus(403);
    }
}
