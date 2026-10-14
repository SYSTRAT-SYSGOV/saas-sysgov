<?php

declare(strict_types=1);

namespace Modules\Multiprofissional\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Multiprofissional\Tests\Concerns\CenarioMultiprofissional;
use Modules\Multiprofissional\Tests\TestCase;

final class TenantIsolationTest extends TestCase
{
    use CenarioMultiprofissional;
    use RefreshDatabase;

    public function test_dados_de_um_tenant_nao_aparecem_no_outro(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestorA = $this->usuario($a, ['multiprofissional_coordenacao']);
        $gestorB = $this->usuario($b, ['multiprofissional_coordenacao']);
        $prof = $this->profissional($a, $gestorA, '52998224725', 'Carla Psicóloga');
        $id = $this->registrarAtendimento($gestorA, $a, $prof)->assertCreated()->json('data.id');

        $this->como($gestorB, $b)->getJson('/api/multiprofissional/atendimentos')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gestorB, $b)->getJson('/api/multiprofissional/profissionais')->assertOk()->assertJsonCount(0, 'data');
        $this->como($gestorB, $b)->getJson("/api/multiprofissional/atendimentos/{$id}")->assertNotFound();
        $this->como($gestorB, $b)->putJson("/api/multiprofissional/profissionais/{$prof->id}", ['cargo_id' => $this->dado($b, 'cargo')->id])->assertNotFound();
    }

    public function test_nao_aceita_referencias_de_outro_tenant(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $gestorA = $this->usuario($a, ['multiprofissional_coordenacao']);
        $prof = $this->profissional($a, $gestorA, '52998224725', 'Carla Psicóloga');

        // Aluno e escola do tenant B num atendimento do tenant A.
        $this->registrarAtendimento($gestorA, $a, $prof, [
            'escola_id' => $this->dado($b, 'centro')->id,
            'alunos' => [$this->dado($b, 'ana')->id],
        ])->assertUnprocessable()->assertJsonValidationErrors(['escola_id', 'alunos.0']);
    }

    public function test_modulo_desabilitado_bloqueia_acesso(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $gestor = $this->usuario($a, ['multiprofissional_coordenacao']);
        \Modules\Admin\Models\Module::where('alias', 'multiprofissional')->firstOrFail()->tenants()->updateExistingPivot($a->id, ['enabled' => false]);

        $this->como($gestor, $a)->getJson('/api/multiprofissional/opcoes')->assertForbidden();
    }
}
