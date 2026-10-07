<?php

declare(strict_types=1);

namespace Modules\Vistoria\Tests\Unit;

use Modules\Pessoas\Models\Pessoa;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Vistoria\Models\LocalFiscalizavel;
use Modules\Vistoria\Policies\LocalFiscalizavelPolicy;
use Modules\Vistoria\Tests\Concerns\CenarioVistoria;
use Tests\TestCase;

/**
 * `User::hasPermission()`/`currentTenantId()` leem o `TenantContext` ambiente — por isso toda
 * chamada à Policy aqui roda dentro de `noTenant()` (mesmo cuidado de `OrdemServicoPolicyTest`).
 */
final class LocalFiscalizavelPolicyTest extends TestCase
{
    use CenarioVistoria;
    use RefreshDatabase;

    public function test_viewany_e_view_exigem_vistoria_view(): void
    {
        $tenant = $this->criarTenant();
        $policy = new LocalFiscalizavelPolicy();

        $this->noTenant($tenant, function () use ($tenant, $policy): void {
            $comPermissao = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Com Permissão');
            $semPermissao = $this->usuarioComPermissao($tenant, [], 'Sem Permissão');
            $local = $this->montarLocal();

            self::assertTrue($policy->viewAny($comPermissao));
            self::assertFalse($policy->viewAny($semPermissao));
            self::assertTrue($policy->view($comPermissao, $local));
            self::assertFalse($policy->view($semPermissao, $local));
        });
    }

    public function test_create_update_delete_exigem_vistoria_locais_manage(): void
    {
        $tenant = $this->criarTenant();
        $policy = new LocalFiscalizavelPolicy();

        $this->noTenant($tenant, function () use ($tenant, $policy): void {
            $gestor = $this->usuarioComPermissao($tenant, ['vistoria.locais.manage'], 'Gestor');
            $apenasVisualizador = $this->usuarioComPermissao($tenant, ['vistoria.view'], 'Visualizador');
            $local = $this->montarLocal();

            self::assertTrue($policy->create($gestor));
            self::assertFalse($policy->create($apenasVisualizador));
            self::assertTrue($policy->update($gestor, $local));
            self::assertFalse($policy->update($apenasVisualizador, $local));
            self::assertTrue($policy->delete($gestor, $local));
            self::assertFalse($policy->delete($apenasVisualizador, $local));
        });
    }

    public function test_view_e_update_recusam_local_de_outro_tenant(): void
    {
        $tenant = $this->criarTenant();
        $outroTenant = $this->criarTenant('prefeitura-b');
        $policy = new LocalFiscalizavelPolicy();

        $local = $this->noTenant($tenant, fn () => $this->montarLocal());

        $this->noTenant($outroTenant, function () use ($outroTenant, $policy, $local): void {
            $gestor = $this->usuarioComPermissao($outroTenant, ['vistoria.locais.manage', 'vistoria.view'], 'Gestor Outro Tenant');

            self::assertFalse($policy->view($gestor, $local));
            self::assertFalse($policy->update($gestor, $local));
        });
    }

    private function montarLocal(): LocalFiscalizavel
    {
        $proprietario = Pessoa::factory()->create();

        return LocalFiscalizavel::create([
            'proprietario_pessoa_id' => $proprietario->id,
            'nome' => 'Fazenda Teste',
            'tipo' => LocalFiscalizavel::TIPO_PROPRIEDADE_RURAL,
            'latitude' => -25.4284,
            'longitude' => -49.2733,
        ]);
    }
}
