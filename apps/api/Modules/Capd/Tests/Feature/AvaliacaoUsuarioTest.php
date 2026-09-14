<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

/**
 * RF-06/RN-08 (art. 25) — Coleta e agregação da Avaliação pelo Usuário Externo
 * para composição do Fator H.
 */
final class AvaliacaoUsuarioTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;
    private User $admin;
    private CicloAvaliacao $ciclo;
    private Servidor $servidor;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tenant = Tenant::create([
            'name'   => 'Município de Araucária Avaliacao Usuario',
            'slug'   => 'pref-avaliacao-usuario',
            'type'   => 'prefeitura',
            'status' => 'active',
        ]);

        app(TenantContext::class)->set($this->tenant);

        $this->user = User::create([
            'name'     => 'Cidadao Usuario',
            'email'    => 'cidadao@araucaria.pr.gov.br',
            'password' => bcrypt('secret'),
        ]);
        $this->user->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->admin = User::create([
            'name'              => 'Admin Avaliacao Usuario',
            'email'             => 'admin.avaliacao.usuario@araucaria.pr.gov.br',
            'password'          => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $this->admin->tenants()->attach($this->tenant->id, ['status' => 'active', 'is_primary' => true]);

        $servidorUser = User::create(['name' => 'Servidor Atendimento', 'email' => 'atendimento@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);

        $this->servidor = Servidor::create([
            'tenant_id'             => $this->tenant->id,
            'user_id'               => $servidorUser->id,
            'matricula'             => 'MAT-800',
            'cpf'                   => '55566677788',
            'nome_completo'         => 'Servidor Atendimento',
            'data_nascimento'       => '1980-05-15',
            'data_admissao'         => '2015-02-01',
            'regime_juridico'       => 'estatutario',
            'regime_previdenciario' => 'rpps',
            'cargo_efetivo'         => 'Atendente',
            'atende_publico'        => true,
            'orgao_lotacao'         => 'Secretaria de Finanças',
            'situacao_funcional'    => 'ativo',
            'estagio_probatorio'    => false,
            'carga_horaria_semanal' => 40,
        ]);

        $this->ciclo = CicloAvaliacao::create([
            'tenant_id'       => $this->tenant->id,
            'nome'            => 'Ciclo 2026',
            'ano_competencia' => 2026,
            'data_inicio'     => '2026-01-01',
            'data_fim'        => '2026-12-31',
            'etapa_cadencia'  => 1,
            'nota_corte_nfc'  => '70.00',
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

    public function test_registra_avaliacao_do_usuario(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->postJson('/api/capd/avaliacao-usuario', [
                'servidor_id'      => $this->servidor->id,
                'ciclo_id'         => $this->ciclo->id,
                'nota_atendimento' => 90.0,
                'comentario'       => 'Ótimo atendimento.',
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('capd_avaliacoes_usuario', [
            'tenant_id'        => $this->tenant->id,
            'servidor_id'      => $this->servidor->id,
            'ciclo_id'         => $this->ciclo->id,
            'nota_atendimento' => '90.00',
        ]);
    }

    public function test_rejeita_nota_fora_da_faixa_0_a_100(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->postJson('/api/capd/avaliacao-usuario', [
                'servidor_id'      => $this->servidor->id,
                'ciclo_id'         => $this->ciclo->id,
                'nota_atendimento' => 150.0,
            ]);

        $response->assertStatus(422);
    }

    public function test_calcula_media_de_avaliacoes_do_usuario(): void
    {
        $this->actingAs($this->user)->withHeaders($this->headers())->postJson('/api/capd/avaliacao-usuario', [
            'servidor_id' => $this->servidor->id, 'ciclo_id' => $this->ciclo->id, 'nota_atendimento' => 80.0,
        ])->assertStatus(201);

        $this->actingAs($this->user)->withHeaders($this->headers())->postJson('/api/capd/avaliacao-usuario', [
            'servidor_id' => $this->servidor->id, 'ciclo_id' => $this->ciclo->id, 'nota_atendimento' => 100.0,
        ])->assertStatus(201);

        $response = $this->actingAs($this->admin)
            ->withHeaders($this->headers())
            ->getJson("/api/capd/avaliacao-usuario/media?servidor_id={$this->servidor->id}&ciclo_id={$this->ciclo->id}");

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(2, $data['total_avaliacoes']);
        $this->assertEquals('90.00', $data['media']);
    }

    public function test_media_e_null_quando_nao_ha_avaliacoes(): void
    {
        $response = $this->actingAs($this->admin)
            ->withHeaders($this->headers())
            ->getJson("/api/capd/avaliacao-usuario/media?servidor_id={$this->servidor->id}&ciclo_id={$this->ciclo->id}");

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertEquals(0, $data['total_avaliacoes']);
        $this->assertNull($data['media']);
    }

    public function test_usuario_sem_permissao_recebe_403_ao_consultar_media(): void
    {
        $response = $this->actingAs($this->user)
            ->withHeaders($this->headers())
            ->getJson("/api/capd/avaliacao-usuario/media?servidor_id={$this->servidor->id}&ciclo_id={$this->ciclo->id}");

        $response->assertStatus(403);
    }
}
