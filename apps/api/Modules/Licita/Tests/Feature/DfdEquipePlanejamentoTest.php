<?php

declare(strict_types=1);

namespace Modules\Licita\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Modules\Licita\Enums\GrauPrioridade;
use Modules\Licita\Services\ProcessoService;
use Modules\Licita\Tests\TestCase;

/**
 * RN: a equipe de planejamento do DFD precisa de pelo menos 2 pessoas —
 * segregação de funções no planejamento da contratação (art. 7º da Lei
 * 14.133/2021). Testado no nível HTTP (não direto no service) porque a
 * regra vive na validação do DfdController, não no DfdService.
 */
final class DfdEquipePlanejamentoTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::create(['name' => 'Prefeitura Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($this->tenant);

        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $this->user = User::create(['name' => 'Gestor', 'email' => 'gestor@pref-teste.gov.br', 'password' => 'secret']);
        $this->user->roles()->syncWithoutDetaching([$role->id]);
        $this->user->tenants()->syncWithoutDetaching([$this->tenant->id => ['status' => 'active']]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    /**
     * @return array<string, mixed>
     */
    private function dadosDfd(array $equipe): array
    {
        return [
            'data_previsao' => '2026-12-01',
            'grau_prioridade' => GrauPrioridade::Media->value,
            'justificativa' => 'Necessidade de contratação de serviço continuado de limpeza.',
            'objeto' => 'Contratação de empresa especializada em serviços de limpeza predial.',
            'equipe_planejamento' => $equipe,
        ];
    }

    public function test_recusa_criar_dfd_com_apenas_uma_pessoa_na_equipe(): void
    {
        Sanctum::actingAs($this->user, ['*']);
        $processo = app(ProcessoService::class)->criar(['objeto' => null], $this->user);

        $response = $this->withHeader('X-Tenant-Slug', 'pref-teste')->postJson(
            "/api/licita/processos/{$processo->id}/dfd",
            $this->dadosDfd([
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
            ]),
        );

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['equipe_planejamento']);
    }

    public function test_permite_criar_dfd_com_duas_pessoas_na_equipe(): void
    {
        Sanctum::actingAs($this->user, ['*']);
        $processo = app(ProcessoService::class)->criar(['objeto' => null], $this->user);

        $response = $this->withHeader('X-Tenant-Slug', 'pref-teste')->postJson(
            "/api/licita/processos/{$processo->id}/dfd",
            $this->dadosDfd([
                ['nome' => 'Fulano', 'cargo' => 'Fiscal', 'matricula' => '001'],
                ['nome' => 'Sicrana', 'cargo' => 'Gestora', 'matricula' => '002'],
            ]),
        );

        $response->assertCreated();
    }
}
