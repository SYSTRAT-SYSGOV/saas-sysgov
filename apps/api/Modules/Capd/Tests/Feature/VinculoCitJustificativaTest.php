<?php

declare(strict_types=1);

namespace Modules\Capd\Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Capd\Database\Seeders\CapdFatoresSeeder;
use Modules\Capd\Models\Avaliacao;
use Modules\Capd\Models\CicloAvaliacao;
use Modules\Capd\Models\DiarioBordo;
use Modules\Capd\Models\FatorAvaliacao;
use Tests\TestCase;

final class VinculoCitJustificativaTest extends TestCase
{
    use RefreshDatabase;

    public function test_salvar_rascunho_aceita_diario_bordo_id_valido_vinculado_a_resposta(): void
    {
        $tenant = Tenant::create(['name' => 'Município Vínculo', 'slug' => 'pref-vinculo', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();

        $admin = User::create([
            'name' => 'Admin Vínculo', 'email' => 'admin.vinculo@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Vínculo', 'email' => 'servidor.vinculo@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233355']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Vínculo 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $fatorF3 = FatorAvaliacao::where('tenant_id', $tenant->id)->where('codigo', 'F3')->firstOrFail();

        $incidente = DiarioBordo::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'fator_id' => $fatorF3->id, 'tipo' => 'negativo',
            'data_ocorrencia' => '2026-03-01', 'descricao_fato' => str_repeat('Fato observável relevante. ', 2),
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson("/api/capd/avaliacoes/{$avaliacao->id}", [
                'respostas_fatores' => [
                    'F3' => ['grau' => 1, 'justificativa' => 'Justificativa com mais de vinte caracteres.', 'diario_bordo_id' => $incidente->id],
                ],
            ]);

        $response->assertStatus(200);
        $this->assertSame($incidente->id, $avaliacao->fresh()->respostas_fatores['F3']['diario_bordo_id']);

        app(TenantContext::class)->clear();
    }

    public function test_salvar_rascunho_rejeita_diario_bordo_id_inexistente(): void
    {
        $tenant = Tenant::create(['name' => 'Município Vínculo Inválido', 'slug' => 'pref-vinculo-inv', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($tenant);

        (new CapdFatoresSeeder())->run();

        $admin = User::create([
            'name' => 'Admin Vínculo Inválido', 'email' => 'admin.vinculo.inv@araucaria.pr.gov.br', 'password' => bcrypt('secret'),
            'is_platform_admin' => true,
        ]);
        $admin->tenants()->attach($tenant->id, ['status' => 'active', 'is_primary' => true]);
        $servidorUser = User::create(['name' => 'Servidor Vínculo Inválido', 'email' => 'servidor.vinculo.inv@araucaria.pr.gov.br', 'password' => bcrypt('secret'), 'cpf' => '11122233366']);

        $ciclo = CicloAvaliacao::create([
            'tenant_id' => $tenant->id, 'nome' => 'Ciclo Vínculo Inválido 2026', 'ano_competencia' => 2026,
            'data_inicio' => '2026-01-01', 'data_fim' => '2026-12-31',
        ]);

        $avaliacao = Avaliacao::create([
            'tenant_id' => $tenant->id, 'ciclo_id' => $ciclo->id, 'servidor_id' => $servidorUser->id,
            'avaliador_id' => $admin->id, 'tipo_avaliacao' => Avaliacao::TIPO_INTEGRAL,
            'status_avaliacao' => Avaliacao::STATUS_ATIVA, 'respostas_fatores' => [],
        ]);

        $response = $this->actingAs($admin)
            ->withHeader('X-Tenant-ID', (string) $tenant->id)
            ->putJson("/api/capd/avaliacoes/{$avaliacao->id}", [
                'respostas_fatores' => [
                    'F3' => ['grau' => 1, 'diario_bordo_id' => 999999],
                ],
            ]);

        $response->assertStatus(422);

        app(TenantContext::class)->clear();
    }
}
