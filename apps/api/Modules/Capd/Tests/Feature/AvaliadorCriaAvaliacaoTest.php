<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Modules\Capd\Models\Avaliacao;
use Tests\TestCase;

final class AvaliadorCriaAvaliacaoTest extends TestCase
{
    use RefreshDatabase;

    public function test_usuario_com_papel_avaliador_e_autorizado_a_criar_avaliacao(): void
    {
        $tenant = Tenant::create(['name' => 'Município Avaliador', 'slug' => 'pref-avaliador', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $chefiaUser = User::create(['name' => 'Chefia', 'email' => 'chefia@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $chefiaUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $role = Role::firstOrCreate(
            ['slug' => 'avaliador', 'scope' => 'tenant', 'tenant_id' => $tenant->id],
            ['name' => 'Chefia Imediata (Avaliador)']
        );
        $chefiaUser->roles()->syncWithoutDetaching([$role->id => ['tenant_id' => $tenant->id]]);

        $this->assertTrue(
            Gate::forUser($chefiaUser->fresh())->allows('create', Avaliacao::class),
            'Usuário com papel "avaliador" (chefia imediata) deve poder iniciar avaliações — CLAUDE.md e o docblock de AvaliacaoPolicy documentam esse papel como autorizado a criar avaliações dos subordinados.'
        );

        app(TenantContext::class)->clear();
    }

    public function test_usuario_sem_papel_relevante_nao_e_autorizado_a_criar_avaliacao(): void
    {
        $tenant = Tenant::create(['name' => 'Município Sem Papel', 'slug' => 'pref-sem-papel', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $servidorUser = User::create(['name' => 'Servidor Comum', 'email' => 'servidor.comum@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidorUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $this->assertFalse(
            Gate::forUser($servidorUser->fresh())->allows('create', Avaliacao::class)
        );

        app(TenantContext::class)->clear();
    }

    public function test_cria_avaliacao_em_ciclo_com_status_aberto(): void
    {
        $tenant = Tenant::create(['name' => 'Município Teste Ciclo', 'slug' => 'pref-ciclo-aberto', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $chefiaUser = User::create(['name' => 'Chefia Imediata', 'email' => 'chefia.aberto@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $chefiaUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $role = Role::firstOrCreate(
            ['slug' => 'avaliador', 'scope' => 'tenant', 'tenant_id' => $tenant->id],
            ['name' => 'Chefia Imediata (Avaliador)']
        );
        $chefiaUser->roles()->syncWithoutDetaching([$role->id => ['tenant_id' => $tenant->id]]);

        $servidorUser = User::create(['name' => 'Servidor Teste', 'email' => 'servidor.aberto@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $servidorUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $chefiaServidor = \Modules\Capd\Models\Servidor::create([
            'tenant_id' => $tenant->id,
            'user_id' => $chefiaUser->id,
            'matricula' => 'CHEF-001',
            'cpf' => '000.000.000-01',
            'nome_completo' => 'Chefia Imediata',
            'cargo_efetivo' => 'Diretor',
            'orgao_lotacao' => 'SMAD',
        ]);

        $servidor = \Modules\Capd\Models\Servidor::create([
            'tenant_id' => $tenant->id,
            'user_id' => $servidorUser->id,
            'matricula' => 'SERV-001',
            'cpf' => '000.000.000-02',
            'nome_completo' => 'Servidor Teste',
            'cargo_efetivo' => 'Auxiliar',
            'orgao_lotacao' => 'SMAD',
            'chefia_imediata_id' => $chefiaServidor->id,
        ]);

        $ciclo = \Modules\Capd\Models\CicloAvaliacao::create([
            'tenant_id' => $tenant->id,
            'nome' => 'Ciclo 2026',
            'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01',
            'data_fim' => '2026-12-31',
            'status' => \Modules\Capd\Models\CicloAvaliacao::STATUS_ABERTO,
        ]);

        $response = $this->actingAs($chefiaUser)
            ->withHeader('X-Tenant-Slug', $tenant->slug)
            ->postJson('/api/capd/avaliacoes', [
                'ciclo_id' => $ciclo->id,
                'servidor_id' => $servidorUser->id,
            ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('capd_avaliacoes', [
            'tenant_id' => $tenant->id,
            'ciclo_id' => $ciclo->id,
            'servidor_id' => $servidorUser->id,
        ]);

        app(TenantContext::class)->clear();
    }
}
