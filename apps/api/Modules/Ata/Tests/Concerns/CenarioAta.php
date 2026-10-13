<?php

declare(strict_types=1);

namespace Modules\Ata\Tests\Concerns;

use App\Models\Role;
use App\Models\Tenant;
use App\Models\User;
use App\Services\ModuleRoleProvisioner;
use App\Support\TenantContext;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Modules\Admin\Models\Module;
use Modules\Ata\Database\Seeders\AtaRbacSeeder;
use Modules\OrgChart\Models\OrgUnit;
use Modules\OrgChart\Models\OrgUnitUser;

/**
 * Cenários com o módulo Ata habilitado, pelo caminho real de perfis e X-Tenant-ID. Organograma mínimo por tenant:
 * Prefeitura → Secretaria de Educação (SMED) → Escola, e Secretaria de Saúde (SMS).
 */
trait CenarioAta
{
    private bool $perfisSemeados = false;

    /** @var array<int, array<string, OrgUnit>> */
    protected array $unidades = [];

    /** PNG 1x1 válido (assinatura de teste). */
    protected const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    protected function criarTenant(string $slug = 'prefeitura-a'): Tenant
    {
        $tenant = Tenant::create(['name' => 'Prefeitura ' . Str::title(str_replace('-', ' ', $slug)), 'slug' => $slug, 'type' => 'prefeitura', 'status' => 'active']);
        if (!$this->perfisSemeados) {
            (new AtaRbacSeeder())->run();
            $this->perfisSemeados = true;
        }
        $modulo = Module::firstOrCreate(['alias' => 'ata'], ['name' => 'Atas', 'enabled' => true, 'monthly_fee_cents' => 0]);
        $modulo->tenants()->syncWithoutDetaching([$tenant->id => ['enabled' => true, 'settings' => json_encode([])]]);
        app(ModuleRoleProvisioner::class)->provisionForTenant($tenant, 'ata');

        $this->noTenant($tenant, function () use ($tenant): void {
            $u = fn (string $nome, string $code, string $tipo, int $nivel, string $path, ?string $sigla = null) => OrgUnit::create([
                'name' => $nome, 'code' => $code, 'acronym' => $sigla, 'type' => $tipo, 'level' => $nivel, 'path' => $path, 'is_active' => true,
            ]);
            $this->unidades[$tenant->id] = [
                'prefeitura' => $u('Prefeitura', 'PREF', 'prefeitura', 1, '1'),
                'smed' => $u('Secretaria Municipal de Educação', 'SMED', 'secretaria', 2, '1.1', 'SMED'),
                'escola' => $u('Escola Municipal Centro', 'EMC', 'setor', 3, '1.1.1'),
                'sms' => $u('Secretaria Municipal de Saúde', 'SMS', 'secretaria', 2, '1.2', 'SMS'),
            ];
        });

        return $tenant;
    }

    protected function unidade(Tenant $tenant, string $chave): OrgUnit
    {
        return $this->unidades[$tenant->id][$chave];
    }

    /** @param list<string> $perfis ata_gestor | ata_secretario | ata_consulta */
    protected function usuario(Tenant $tenant, array $perfis = ['ata_secretario'], ?string $lotacao = 'escola'): User
    {
        $user = User::create(['name' => 'Usuário ' . Str::random(5), 'email' => Str::lower(Str::random(10)) . '@teste.com.br', 'password' => bcrypt('secret')]);
        $tenant->users()->attach($user->id, ['status' => 'active', 'is_primary' => true]);
        foreach ($perfis as $slug) {
            $user->roles()->attach(Role::where('slug', $slug)->where('tenant_id', $tenant->id)->firstOrFail()->id, ['tenant_id' => $tenant->id]);
        }
        $user->clearPermissionCache();
        if ($lotacao !== null) {
            $this->noTenant($tenant, fn () => OrgUnitUser::create(['org_unit_id' => $this->unidade($tenant, $lotacao)->id, 'user_id' => $user->id, 'role' => 'membro', 'is_primary' => true]));
        }

        return $user;
    }

    protected function como(User $user, Tenant $tenant): static
    {
        return $this->flushHeaders()->actingAs($user)->withHeader('X-Tenant-ID', (string) $tenant->id);
    }

    protected function noTenant(Tenant $tenant, callable $acao): mixed
    {
        $context = app(TenantContext::class);
        $anterior = $context->hasTenant() ? $context->get() : null;
        $context->set($tenant);
        try {
            return $acao();
        } finally {
            $anterior !== null ? $context->set($anterior) : $context->clear();
        }
    }

    /**
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    protected function dadosAta(Tenant $tenant, array $extra = []): array
    {
        return [
            'org_unit_id' => $this->unidade($tenant, 'smed')->id,
            'titulo' => 'Reunião do conselho escolar',
            'data_reuniao' => '2026-10-12 14:00',
            'local' => 'Sala de reuniões',
            'cidade' => 'Cidade Exemplo',
            'redator' => 'Maria Redatora',
            'participantes' => [['nome' => 'Ana Souza', 'cargo' => 'Diretora'], ['nome' => 'Bruno Lima']],
            ...$extra,
        ];
    }

    /**
     * @param array<string, mixed> $extra
     * @return TestResponse<\Illuminate\Http\JsonResponse>
     */
    protected function criarAta(User $user, Tenant $tenant, array $extra = []): TestResponse
    {
        return $this->como($user, $tenant)->postJson('/api/ata/atas', $this->dadosAta($tenant, $extra));
    }

    /**
     * Ata em rascunho (texto travado) e com o id dos participantes.
     *
     * @param array<string, mixed> $extra
     * @return array<string, mixed>
     */
    protected function ataEmRascunho(User $user, Tenant $tenant, array $extra = []): array
    {
        $ata = $this->criarAta($user, $tenant, $extra)->assertCreated()->json();
        $this->como($user, $tenant)->postJson("/api/ata/atas/{$ata['id']}/rascunho", ['conteudo_html' => '<p>Texto final da reunião.</p>'])->assertOk();

        return $ata;
    }
}
