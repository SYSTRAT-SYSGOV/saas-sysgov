<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PromocaoControllerTest extends PessoasTestCase
{
    private Tenant $tenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
    }

    public function test_admin_promove_pessoa_a_usuario_via_api(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $role = Role::create(['name' => 'Munícipe', 'slug' => 'municipe_' . $pessoa->id, 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web']);

        $this->como($this->admin($this->tenant), $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/promover", ['email' => 'maria@teste.gov.br', 'role_id' => $role->id])
            ->assertCreated();

        self::assertSame(1, PessoaUsuario::count());
    }

    public function test_promocao_sem_permissao_e_rejeitada(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $role = Role::create(['name' => 'Munícipe', 'slug' => 'municipe_' . $pessoa->id, 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web']);
        $usuario = $this->usuario($this->tenant, ['cadastros.pessoas.view']);

        $this->como($usuario, $this->tenant)
            ->postJson("/api/pessoas/{$pessoa->id}/promover", ['email' => 'maria@teste.gov.br', 'role_id' => $role->id])
            ->assertForbidden();

        self::assertSame(0, PessoaUsuario::count());
    }
}
