<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\UserService;
use App\Support\TenantContext;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Models\PessoaUsuario;
use Modules\Pessoas\Services\PessoaDoUsuarioService;

/** Usuário criado no admin do órgão passa a ter pessoa no Cadastro de Pessoas (criada, ou pareada pelo e-mail). */
final class UsuarioViraPessoaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private User $adminTenant;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        $this->tenant = Tenant::create(['name' => 'Prefeitura Cliente', 'slug' => 'pref-cliente', 'cnpj' => '12345678000199', 'type' => 'prefeitura', 'status' => 'active']);

        $template = Role::where('slug', 'admin_tenant')->firstOrFail();
        $role = Role::create(['name' => 'Administrador do Tenant', 'slug' => 'admin_tenant', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));

        $this->adminTenant = User::create(['name' => 'Admin Tenant', 'email' => 'admin-tenant@cliente.test', 'password' => 'StrongPass!123', 'is_active' => true]);
        $this->adminTenant->roles()->syncWithoutDetaching([$role->id]);
        $this->adminTenant->tenants()->syncWithoutDetaching([$this->tenant->id => ['role_id' => $role->id, 'status' => 'active', 'is_primary' => true]]);
    }

    protected function tearDown(): void
    {
        app(TenantContext::class)->clear();
        parent::tearDown();
    }

    private function usuario(string $email = 'maria@cliente.test'): User
    {
        return User::create(['name' => 'Maria Souza', 'email' => $email, 'password' => 'StrongPass!123', 'is_active' => true]);
    }

    private function pessoaComEmail(string $email, string $nome = 'Maria Souza'): Pessoa
    {
        app(TenantContext::class)->set($this->tenant);
        $pessoa = Pessoa::create(['tipo' => 'fisica', 'nome' => $nome]);
        $pessoa->contatos()->create(['tipo' => 'email', 'valor' => $email, 'principal' => true]);
        app(TenantContext::class)->clear();

        return $pessoa;
    }

    public function test_cria_pessoa_pendente_com_email_e_liga_ao_usuario(): void
    {
        $user = $this->usuario();

        $pessoa = app(PessoaDoUsuarioService::class)->garantir($user, $this->tenant, $this->adminTenant->id);

        $this->assertNotNull($pessoa);
        $this->assertTrue($pessoa->documento_pendente);
        $this->assertSame('Maria Souza', $pessoa->nome);
        $this->assertSame('maria@cliente.test', $pessoa->contatos()->where('tipo', 'email')->value('valor'));
        $this->assertSame($this->tenant->id, $pessoa->tenant_id);
        $vinculo = PessoaUsuario::withoutGlobalScopes()->where('user_id', $user->id)->sole();
        $this->assertSame($pessoa->id, $vinculo->pessoa_id);
        $this->assertSame($this->tenant->id, (int) $vinculo->tenant_id);
        $this->assertSame($this->adminTenant->id, $vinculo->promovido_por);
    }

    public function test_pareia_com_pessoa_existente_pelo_email_sem_criar_duplicada(): void
    {
        $existente = $this->pessoaComEmail('Maria@Cliente.test');
        $user = $this->usuario('maria@cliente.test');

        $pessoa = app(PessoaDoUsuarioService::class)->garantir($user, $this->tenant);

        $this->assertSame($existente->id, $pessoa?->id);
        $this->assertSame(1, Pessoa::withoutGlobalScopes()->count());
        $this->assertSame($existente->id, PessoaUsuario::withoutGlobalScopes()->where('user_id', $user->id)->value('pessoa_id'));
    }

    public function test_mais_de_uma_candidata_nao_e_adivinhada(): void
    {
        $this->pessoaComEmail('maria@cliente.test', 'Maria A');
        $this->pessoaComEmail('maria@cliente.test', 'Maria B');
        $user = $this->usuario();

        $this->assertNull(app(PessoaDoUsuarioService::class)->garantir($user, $this->tenant));
        $this->assertSame(0, PessoaUsuario::withoutGlobalScopes()->count());
        $this->assertSame(2, Pessoa::withoutGlobalScopes()->count());
    }

    public function test_pessoa_ja_ligada_a_outro_usuario_nao_e_tomada(): void
    {
        $existente = $this->pessoaComEmail('maria@cliente.test');
        $outro = $this->usuario('outro@cliente.test');
        PessoaUsuario::query()->forceCreate(['tenant_id' => $this->tenant->id, 'pessoa_id' => $existente->id, 'user_id' => $outro->id, 'promovido_em' => now()]);
        $user = $this->usuario();

        $pessoa = app(PessoaDoUsuarioService::class)->garantir($user, $this->tenant);

        $this->assertNotSame($existente->id, $pessoa?->id);
        $this->assertSame($existente->id, PessoaUsuario::withoutGlobalScopes()->where('user_id', $outro->id)->value('pessoa_id'));
    }

    public function test_repetir_nao_duplica(): void
    {
        $user = $this->usuario();
        $service = app(PessoaDoUsuarioService::class);

        $primeira = $service->garantir($user, $this->tenant);
        $segunda = $service->garantir($user, $this->tenant);

        $this->assertSame($primeira?->id, $segunda?->id);
        $this->assertSame(1, Pessoa::withoutGlobalScopes()->count());
        $this->assertSame(1, PessoaUsuario::withoutGlobalScopes()->count());
    }

    public function test_usuario_ligado_em_outro_orgao_nao_ganha_segunda_pessoa(): void
    {
        $user = $this->usuario();
        $outroOrgao = Tenant::create(['name' => 'Câmara', 'slug' => 'camara', 'cnpj' => '98765432000100', 'type' => 'prefeitura', 'status' => 'active']);
        $service = app(PessoaDoUsuarioService::class);
        $service->garantir($user, $outroOrgao);

        $this->assertNull($service->garantir($user, $this->tenant));
        $this->assertSame(1, PessoaUsuario::withoutGlobalScopes()->count());
    }

    public function test_usuario_da_plataforma_nao_vira_pessoa(): void
    {
        $user = User::create(['name' => 'Plataforma', 'email' => 'plataforma@systrat.test', 'password' => 'StrongPass!123', 'is_active' => true, 'is_systrat' => true]);

        $this->assertNull(app(PessoaDoUsuarioService::class)->garantir($user, $this->tenant));
        $this->assertSame(0, Pessoa::withoutGlobalScopes()->count());
    }

    public function test_contexto_do_orgao_e_restaurado(): void
    {
        $outro = Tenant::create(['name' => 'Câmara', 'slug' => 'camara', 'cnpj' => '98765432000100', 'type' => 'prefeitura', 'status' => 'active']);
        app(TenantContext::class)->set($outro);

        app(PessoaDoUsuarioService::class)->garantir($this->usuario(), $this->tenant);

        $this->assertSame($outro->id, app(TenantContext::class)->id());
    }

    public function test_criar_usuario_do_tenant_pelo_admin_cria_a_pessoa(): void
    {
        Role::create(['name' => 'Pregoeiro', 'slug' => 'pregoeiro', 'scope' => 'tenant', 'tenant_id' => $this->tenant->id, 'guard_name' => 'web', 'is_system' => true]);

        $this->actingAs($this->adminTenant, 'sanctum')->withHeader('X-Tenant-Slug', $this->tenant->slug)
            ->postJson('/api/users', [
                'name' => 'Novo Pregoeiro', 'email' => 'novo@cliente.test', 'password' => 'StrongPass!123',
                'password_confirmation' => 'StrongPass!123', 'role_slug' => 'pregoeiro',
            ])->assertCreated();

        $user = User::where('email', 'novo@cliente.test')->firstOrFail();
        $pessoaId = PessoaUsuario::withoutGlobalScopes()->where('user_id', $user->id)->value('pessoa_id');
        $this->assertNotNull($pessoaId);
        $this->assertSame('Novo Pregoeiro', Pessoa::withoutGlobalScopes()->findOrFail($pessoaId)->nome);
    }

    public function test_cadastro_de_administrador_do_tenant_cria_a_pessoa(): void
    {
        $user = app(UserService::class)->createTenantAdmin($this->tenant, ['name' => 'Novo Admin', 'email' => 'novo-admin@cliente.test', 'password' => 'StrongPass!123']);

        $vinculo = PessoaUsuario::withoutGlobalScopes()->where('user_id', $user->id)->sole();
        $this->assertSame($this->tenant->id, (int) $vinculo->tenant_id);
        $this->assertSame('Novo Admin', Pessoa::withoutGlobalScopes()->findOrFail($vinculo->pessoa_id)->nome);
    }
}
