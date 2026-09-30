<?php

declare(strict_types=1);

namespace Modules\Pessoas\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Services\PromocaoUsuarioService;
use Modules\Pessoas\Support\RegraNegocioException;
use Modules\Pessoas\Tests\PessoasTestCase;

final class PromocaoUsuarioTest extends PessoasTestCase
{
    private Tenant $tenant;
    private PromocaoUsuarioService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = $this->criarTenant();
        $this->noTenant($this->tenant);
        $this->service = app(PromocaoUsuarioService::class);
    }

    public function test_promove_pessoa_a_usuario_vinculando_por_cpf_e_auditando(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $role = Role::create(['name' => 'Munícipe Autenticado', 'slug' => 'municipe_' . $pessoa->id, 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web']);
        $admin = $this->admin($this->tenant);

        $vinculo = $this->service->promover($pessoa, 'maria@teste.gov.br', $role, $admin->id);

        self::assertSame($pessoa->id, $vinculo->pessoa_id);
        self::assertNull(User::findOrFail($vinculo->user_id)->password);
        self::assertSame(1, Pessoa::count(), 'A promoção não deve criar uma segunda pessoa.');
        self::assertSame(1, \App\Models\AuditLog::where('action', 'pessoa.promovida_usuario')->count());
    }

    public function test_pessoa_ja_promovida_nao_pode_ser_promovida_de_novo(): void
    {
        $pessoa = Pessoa::create(['nome' => 'Maria Titular', 'cpf' => $this->cpfValido()]);
        $role = Role::create(['name' => 'Munícipe', 'slug' => 'municipe_' . $pessoa->id, 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web']);

        $this->service->promover($pessoa, 'maria@teste.gov.br', $role, null);

        $this->expectException(RegraNegocioException::class);
        $this->service->promover($pessoa, 'maria2@teste.gov.br', $role, null);
    }
}
