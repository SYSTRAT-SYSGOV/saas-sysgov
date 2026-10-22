<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cadastra o módulo 'users' no catálogo de módulos caso não exista
        $module = DB::table('modules')->where('alias', 'users')->first();
        if ($module === null) {
            DB::table('modules')->insert([
                'name' => 'Gestão de Usuários & Acessos',
                'alias' => 'users',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 2. Garante que todos os tenants tenham o módulo users habilitado em tenant_module
        $usersModuleId = DB::table('modules')->where('alias', 'users')->value('id');
        if ($usersModuleId) {
            $tenants = DB::table('tenants')->pluck('id');
            foreach ($tenants as $tId) {
                $exists = DB::table('tenant_module')
                    ->where('tenant_id', $tId)
                    ->where('module_id', $usersModuleId)
                    ->exists();

                if (!$exists) {
                    DB::table('tenant_module')->insert([
                        'tenant_id' => $tId,
                        'module_id' => $usersModuleId,
                        'enabled' => true,
                    ]);
                }
            }
        }

        // 3. Garante que os itens de menu em client_menu_items estejam ativos e com rota limpa
        DB::table('client_menu_items')
            ->where('route', '/usuarios')
            ->update([
                'is_active' => true,
                'permission' => 'users.manage',
                'module_alias' => 'users',
            ]);

        // 4. Garante que o item no menu_items do painel Admin esteja ativo
        DB::table('menu_items')
            ->where('route', 'admin_users')
            ->update([
                'is_active' => true,
                'permission' => null,
            ]);
    }

    public function down(): void
    {
        // Operação idempotente e segura
    }
};
