<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\EscalaGrafica;
use Modules\Capd\Models\ModeloFormulario;
use Tests\TestCase;

/**
 * Testes das Escalas Gráficas Configuráveis por Formulário (RF-03).
 */
final class EscalaGraficaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private ModeloFormulario $modelo;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Escalas',
            'slug'   => 'pref-escalas',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create([
            'name'              => 'Admin Escalas',
            'email'             => 'admin.escalas@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->modelo = ModeloFormulario::create([
            'tenant_id'       => $this->tenant->id,
            'codigo'          => 'MOD_ESCALA_2026',
            'nome'            => 'Modelo com Escala Customizada',
            'versao'          => 1,
            'vigencia_inicio' => '2026-01-01',
            'ativo'           => true,
        ]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    public function test_criar_escala_grafica_valida_com_5_niveis(): void
    {
        $payload = [
            'nome'      => 'Escala Padrão Chiavenato 2026',
            'descricao' => 'Graus de 1 a 5 cobrindo 0 a 100 pontos',
            'niveis'    => [
                ['grau' => 1, 'rotulo' => 'Insuficiente', 'valor_min' => 0,  'valor_max' => 59.99],
                ['grau' => 2, 'rotulo' => 'Regular',      'valor_min' => 60, 'valor_max' => 74.99],
                ['grau' => 3, 'rotulo' => 'Bom',          'valor_min' => 75, 'valor_max' => 84.99],
                ['grau' => 4, 'rotulo' => 'Muito Bom',    'valor_min' => 85, 'valor_max' => 94.99],
                ['grau' => 5, 'rotulo' => 'Excelente',    'valor_min' => 95, 'valor_max' => 100],
            ],
        ];

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/escalas-graficas", $payload);

        $response->assertStatus(201);
        $data = $response->json();

        $this->assertEquals('Escala Padrão Chiavenato 2026', $data['nome']);
        $this->assertEquals(5, $data['qtd_niveis']);
        $this->assertTrue($data['ativa']);
        $this->assertCount(5, $data['niveis']);
    }

    public function test_rejeita_escala_com_menos_de_3_niveis(): void
    {
        $payload = [
            'nome'   => 'Escala Binária Inválida',
            'niveis' => [
                ['grau' => 1, 'rotulo' => 'Abaixo', 'valor_min' => 0,  'valor_max' => 50],
                ['grau' => 2, 'rotulo' => 'Acima',  'valor_min' => 50, 'valor_max' => 100],
            ],
        ];

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/escalas-graficas", $payload);

        $response->assertStatus(422);
    }

    public function test_rejeita_escala_cujo_grau_1_nao_comeca_em_zero(): void
    {
        $payload = [
            'nome'   => 'Escala com Início Inválido',
            'niveis' => [
                ['grau' => 1, 'rotulo' => 'Regular',   'valor_min' => 10, 'valor_max' => 60],
                ['grau' => 2, 'rotulo' => 'Bom',       'valor_min' => 60, 'valor_max' => 85],
                ['grau' => 3, 'rotulo' => 'Excelente', 'valor_min' => 85, 'valor_max' => 100],
            ],
        ];

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/escalas-graficas", $payload);

        $response->assertStatus(422);
        $response->assertJson(['message' => 'O grau 1 deve iniciar em 0.']);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_criar_escala(): void
    {
        $semPermissao = User::create([
            'name'     => 'Servidor Comum',
            'email'    => 'servidor.escalas@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $semPermissao->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $payload = [
            'nome'   => 'Escala Não Autorizada',
            'niveis' => [
                ['grau' => 1, 'rotulo' => 'Abaixo', 'valor_min' => 0,  'valor_max' => 50],
                ['grau' => 2, 'rotulo' => 'Médio',  'valor_min' => 50, 'valor_max' => 80],
                ['grau' => 3, 'rotulo' => 'Acima',  'valor_min' => 80, 'valor_max' => 100],
            ],
        ];

        $response = $this->actingAs($semPermissao)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->postJson("/api/capd/modelos-formulario/{$this->modelo->id}/escalas-graficas", $payload);

        $response->assertStatus(403);
    }

    public function test_listar_escalas_do_modelo(): void
    {
        EscalaGrafica::create([
            'tenant_id'  => $this->tenant->id,
            'modelo_id'  => $this->modelo->id,
            'nome'       => 'Escala Existente',
            'qtd_niveis' => 3,
            'ativa'      => true,
        ]);

        $response = $this->actingAs($this->user)
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson("/api/capd/modelos-formulario/{$this->modelo->id}/escalas-graficas");

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertCount(1, $data);
        $this->assertEquals('Escala Existente', $data[0]['nome']);
    }
}
