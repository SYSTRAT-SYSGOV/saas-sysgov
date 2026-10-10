<?php

declare(strict_types=1);

namespace Modules\Inservivel\Tests\Feature;

use App\Support\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Modules\Inservivel\Models\Bem;
use Modules\Inservivel\Tests\Concerns\CenarioInservivel;
use Modules\Inservivel\Tests\TestCase;

/** spec: inservivel › Permissões e perfis do módulo Inservível (D1). */
final class FundacaoTest extends TestCase
{
    use RefreshDatabase;
    use CenarioInservivel;

    public function test_perfis_tem_as_permissoes_da_spec(): void
    {
        $tenant = $this->criarTenant();
        $gestor = $this->usuario($tenant, ['inservivel_gestor']);
        $servidor = $this->usuario($tenant, ['inservivel_servidor']);
        $entidade = $this->usuario($tenant, ['inservivel_entidade']);

        self::assertTrue($gestor->hasPermission('inservivel.transferencias.aprovar', $tenant->id));
        self::assertFalse($gestor->hasPermission('inservivel.portal', $tenant->id));
        self::assertTrue($servidor->hasPermission('inservivel.lotes.manage', $tenant->id));
        self::assertFalse($servidor->hasPermission('inservivel.lotes.gestao', $tenant->id));
        self::assertTrue($entidade->hasPermission('inservivel.portal', $tenant->id));
        self::assertFalse($entidade->hasPermission('inservivel.view', $tenant->id));
    }

    public function test_tenant_sem_o_modulo_recebe_403(): void
    {
        $tenant = $this->criarTenant('prefeitura-sem', comModulo: false);
        $user = $this->usuario($this->criarTenant('outra'), ['inservivel_gestor']);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => false]);

        $this->como($user, $tenant)->getJson('/api/inservivel/bens')->assertForbidden();
    }

    public function test_entidade_nao_acessa_rotas_internas(): void
    {
        $tenant = $this->criarTenant();
        $entidade = $this->usuario($tenant, ['inservivel_entidade']);

        $this->como($entidade, $tenant)->getJson('/api/inservivel/bens')->assertForbidden();
        $this->como($entidade, $tenant)->getJson('/api/inservivel/configuracoes')->assertForbidden();
    }

    public function test_isolamento_entre_prefeituras(): void
    {
        $a = $this->criarTenant('prefeitura-a');
        $b = $this->criarTenant('prefeitura-b');
        $bemA = $this->bem($a, '555');
        $this->bem($b, '555');

        $resposta = $this->como($this->usuario($b), $b)->getJson('/api/inservivel/bens')->assertOk();
        self::assertCount(1, $resposta->json('data'));
        self::assertNotSame($bemA->id, $resposta->json('data.0.id'));
        $this->como($this->usuario($b), $b)->getJson("/api/inservivel/bens/{$bemA->id}")->assertNotFound();
    }

    public function test_nao_cria_bem_sem_tenant(): void
    {
        app(TenantContext::class)->clear();
        $this->expectException(LogicException::class);

        Bem::create(['numero_patrimonial' => 'X', 'descricao' => 'Órfão', 'situacao_id' => 1, 'secretaria_unit_id' => 1]);
    }
}
