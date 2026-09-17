<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Models\Servidor;
use Tests\TestCase;

final class ServidorMeusSubordinadosTest extends TestCase
{
    use RefreshDatabase;

    public function test_filtra_servidores_pelos_subordinados_diretos_do_usuario_logado(): void
    {
        $tenant = Tenant::create(['name' => 'Município Hierarquia', 'slug' => 'pref-hierarquia', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        $chefiaUser = User::create(['name' => 'Chefia Direta', 'email' => 'chefia.direta@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $chefiaUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $outraChefiaUser = User::create(['name' => 'Outra Chefia', 'email' => 'outra.chefia@araucaria.pr.gov.br', 'password' => bcrypt('secret')]);
        $outraChefiaUser->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);

        $chefiaServidor = Servidor::create([
            'tenant_id' => $tenant->id, 'user_id' => $chefiaUser->id, 'matricula' => 'CHEFE-001', 'cpf' => '10020030044',
            'nome_completo' => 'Chefia Direta', 'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps',
            'cargo_efetivo' => 'Diretor', 'orgao_lotacao' => 'SMAD', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);
        $outraChefiaServidor = Servidor::create([
            'tenant_id' => $tenant->id, 'user_id' => $outraChefiaUser->id, 'matricula' => 'CHEFE-002', 'cpf' => '20030040055',
            'nome_completo' => 'Outra Chefia', 'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps',
            'cargo_efetivo' => 'Diretor', 'orgao_lotacao' => 'SMF', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
        ]);

        Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SUB-001', 'cpf' => '30040050066',
            'nome_completo' => 'Subordinado Um', 'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps',
            'cargo_efetivo' => 'Analista', 'orgao_lotacao' => 'SMAD', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
            'chefia_imediata_id' => $chefiaServidor->id,
        ]);
        Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SUB-002', 'cpf' => '40050060077',
            'nome_completo' => 'Subordinado Dois', 'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps',
            'cargo_efetivo' => 'Técnico', 'orgao_lotacao' => 'SMAD', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
            'chefia_imediata_id' => $chefiaServidor->id,
        ]);
        // Subordinado de outra chefia — não deve aparecer no filtro da primeira.
        Servidor::create([
            'tenant_id' => $tenant->id, 'matricula' => 'SUB-003', 'cpf' => '50060070088',
            'nome_completo' => 'Subordinado Três', 'regime_juridico' => 'estatutario', 'regime_previdenciario' => 'rpps',
            'cargo_efetivo' => 'Fiscal', 'orgao_lotacao' => 'SMF', 'situacao_funcional' => 'ativo',
            'estagio_probatorio' => false, 'carga_horaria_semanal' => 40,
            'chefia_imediata_id' => $outraChefiaServidor->id,
        ]);

        $response = $this->actingAs($chefiaUser)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->getJson('/api/capd/servidores?meus_subordinados=1');

        $response->assertStatus(200);
        /** @var array<int, array{matricula: string}> $data */
        $data = $response->json('data');
        $matriculas = array_column($data, 'matricula');
        sort($matriculas);
        $this->assertSame(['SUB-001', 'SUB-002'], $matriculas);

        app(TenantContext::class)->clear();
    }
}
