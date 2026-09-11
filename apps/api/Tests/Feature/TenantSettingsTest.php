<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\RbacSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Configurações institucionais do tenant (logo + CNPJ/endereço/telefone
 * usados no cabeçalho dos documentos gerados) — ver
 * App\Http\Controllers\TenantSettingsController.
 */
final class TenantSettingsTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;
    private Tenant $outroTenant;
    private User $admin;
    private User $membroSemPermissao;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(RbacSeeder::class);
        Storage::fake('public');

        $this->tenant = Tenant::create(['name' => 'Prefeitura de Teste', 'slug' => 'pref-teste', 'type' => 'prefeitura', 'status' => 'active']);
        $this->outroTenant = Tenant::create(['name' => 'Outra Prefeitura', 'slug' => 'outra-pref', 'type' => 'prefeitura', 'status' => 'active']);

        $roleAdmin = $this->cloneRole('admin_tenant', $this->tenant);
        $roleMembro = $this->cloneRole('membro', $this->tenant);

        $this->admin = User::create(['name' => 'Admin', 'email' => 'admin@teste.gov.br', 'password' => bcrypt('secret')]);
        $this->attachTenantRole($this->admin, $roleAdmin, $this->tenant);

        $this->membroSemPermissao = User::create(['name' => 'Membro', 'email' => 'membro@teste.gov.br', 'password' => bcrypt('secret')]);
        $this->attachTenantRole($this->membroSemPermissao, $roleMembro, $this->tenant);
    }

    private function cloneRole(string $slug, Tenant $tenant): Role
    {
        $template = Role::where('slug', $slug)->where('scope', 'tenant')->firstOrFail();
        $role = Role::create(['name' => $template->name, 'slug' => $slug, 'scope' => 'tenant', 'tenant_id' => $tenant->id, 'guard_name' => 'web', 'is_system' => true]);
        $role->permissions()->sync($template->permissions()->pluck('permissions.id'));
        return $role;
    }

    private function attachTenantRole(User $user, Role $role, Tenant $tenant): void
    {
        $user->roles()->syncWithoutDetaching([$role->id]);
        if (Schema::hasColumn('role_user', 'tenant_id')) {
            DB::table('role_user')->where('role_id', $role->id)->where('user_id', $user->id)->update(['tenant_id' => $tenant->id]);
        }
        $user->tenants()->syncWithoutDetaching([$tenant->id => ['role_id' => $role->id, 'status' => 'active']]);
    }

    public function test_admin_tenant_le_e_atualiza_os_dados_institucionais_do_proprio_tenant(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/tenant-settings')
            ->assertOk()
            ->assertJson(['customLogoUrl' => null, 'documentInfo' => ['cnpj' => null]]);

        $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->putJson('/api/tenant-settings', ['documentInfo' => ['cnpj' => '11.222.333/0001-44', 'cidade' => 'Araucária']])
            ->assertOk()
            ->assertJsonPath('documentInfo.cnpj', '11.222.333/0001-44')
            ->assertJsonPath('documentInfo.cidade', 'Araucária');

        self::assertSame('11.222.333/0001-44', $this->tenant->fresh()->settings['documentInfo']['cnpj']);
    }

    public function test_membro_sem_permissao_le_mas_nao_atualiza(): void
    {
        $this->actingAs($this->membroSemPermissao, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->getJson('/api/tenant-settings')
            ->assertOk();

        $this->actingAs($this->membroSemPermissao, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->putJson('/api/tenant-settings', ['documentInfo' => ['cnpj' => '99.999.999/0001-99']])
            ->assertForbidden();

        self::assertNull($this->tenant->fresh()->settings['documentInfo']['cnpj'] ?? null);
    }

    public function test_upload_e_remocao_de_logo(): void
    {
        // ->create() em vez de ->image(): a extensão GD (necessária pro
        // ->image() gerar um GIF/PNG de verdade em memória) não está
        // instalada na imagem PHP do container — um arquivo fake com
        // mimetype declarado 'image/png' já basta pra validação `image`
        // do Laravel, que confia no mimetype, não decodifica o conteúdo.
        $arquivo = UploadedFile::fake()->create('logo.png', 10, 'image/png');

        $upload = $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->post('/api/tenant-settings/logo', ['logo' => $arquivo], ['Accept' => 'application/json']);

        $upload->assertOk();
        $logoUrl = $upload->json('customLogoUrl');
        self::assertNotNull($logoUrl);
        self::assertStringContainsString("tenants/{$this->tenant->id}/logo.png", $logoUrl);
        Storage::disk('public')->assertExists("tenants/{$this->tenant->id}/logo.png");

        $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->deleteJson('/api/tenant-settings/logo')
            ->assertOk()
            ->assertJson(['customLogoUrl' => null]);

        Storage::disk('public')->assertMissing("tenants/{$this->tenant->id}/logo.png");
    }

    public function test_upload_rejeita_arquivo_que_nao_e_imagem(): void
    {
        $arquivo = UploadedFile::fake()->create('documento.pdf', 100, 'application/pdf');

        $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->tenant->id)
            ->post('/api/tenant-settings/logo', ['logo' => $arquivo], ['Accept' => 'application/json'])
            ->assertStatus(422);
    }

    public function test_usuario_nao_acessa_configuracoes_de_um_tenant_ao_qual_nao_pertence(): void
    {
        // ResolveTenant (middleware 'tenant') já barra isso antes do controller
        // rodar — o admin do tenant A não tem tenant_user ativo no tenant B.
        $this->actingAs($this->admin, 'sanctum')
            ->withHeader('X-Tenant-ID', (string) $this->outroTenant->id)
            ->getJson('/api/tenant-settings')
            ->assertForbidden();
    }
}
