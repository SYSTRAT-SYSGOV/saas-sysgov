<?php

declare(strict_types=1);

namespace Modules\Admin\Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Modules\Admin\Tests\TestCase;
use Modules\Client\Models\ClientMenuGroup;
use Modules\Client\Models\ClientMenuItem;

/**
 * O module:register roda a cada boot do container: o menu do cliente não pode duplicar o módulo.
 */
final class RegisterModuleMenuClienteTest extends TestCase
{
    use RefreshDatabase;

    private function grupo(): ClientMenuGroup
    {
        return ClientMenuGroup::create(['tenant_id' => null, 'name' => 'GESTÃO SETORIAL', 'slug' => 'gestao-setorial', 'icon' => 'Building2', 'order' => 2, 'is_active' => true]);
    }

    /** @param array<string, mixed> $extra */
    private function item(ClientMenuGroup $grupo, string $route, string $alias, array $extra = []): ClientMenuItem
    {
        return ClientMenuItem::create(array_merge([
            'menu_group_id' => $grupo->id, 'label' => ucfirst($alias), 'route' => $route, 'icon' => 'Layers', 'permission' => "{$alias}.view",
            'module_alias' => $alias, 'shortcut' => 'X', 'order' => 1, 'is_active' => true,
        ], $extra));
    }

    public function test_modulo_que_ja_tem_entrada_em_outra_rota_nao_ganha_uma_duplicada(): void
    {
        $this->item($this->grupo(), '/contratos', 'contracts', ['label' => 'Contratos']);

        $this->artisan('module:register', ['module' => 'Contracts'])->assertSuccessful();

        $this->assertSame(0, ClientMenuItem::query()->where('route', '/contracts')->count());
        $this->assertSame(1, ClientMenuItem::query()->where('module_alias', 'contracts')->count());
    }

    public function test_rodar_o_registro_de_novo_nao_cria_nem_multiplica_entradas(): void
    {
        $this->grupo();

        $this->artisan('module:register', ['module' => 'Ata'])->assertSuccessful();
        $this->artisan('module:register', ['module' => 'Ata'])->assertSuccessful();

        $this->assertSame(1, ClientMenuItem::query()->where('module_alias', 'ata')->count());
        $this->assertTrue(ClientMenuItem::query()->where('route', '/ata')->firstOrFail()->is_active);
    }

    public function test_entrada_existente_acompanha_o_icone_do_manifesto(): void
    {
        $item = $this->item($this->grupo(), '/ata', 'ata', ['label' => 'Atas', 'icon' => 'Layers']);

        $this->artisan('module:register', ['module' => 'Ata'])->assertSuccessful();

        $this->assertSame('FileSignature', $item->refresh()->icon);
        $this->assertSame(1, ClientMenuItem::query()->where('module_alias', 'ata')->count());
    }

    public function test_force_cria_a_entrada_mesmo_com_o_modulo_ja_presente_em_outra_rota(): void
    {
        $this->item($this->grupo(), '/contratos', 'contracts', ['label' => 'Contratos']);

        $this->artisan('module:register', ['module' => 'Contracts', '--force' => true])->assertSuccessful();

        $this->assertSame(1, ClientMenuItem::query()->where('route', '/contracts')->count());
    }

    public function test_modulo_sem_entrada_no_menu_ganha_a_sua(): void
    {
        $this->grupo();

        $this->artisan('module:register', ['module' => 'Passeio'])->assertSuccessful();

        $item = ClientMenuItem::query()->where('route', '/passeio')->firstOrFail();
        $this->assertSame('passeio', $item->module_alias);
        $this->assertTrue($item->is_active);
    }
}
