<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Vínculo principal do usuário: a secretaria/órgão ao qual pertence no tenant
        Schema::table('tenant_user', function (Blueprint $t): void {
            if (!Schema::hasColumn('tenant_user', 'primary_org_unit_id')) {
                $t->foreignId('primary_org_unit_id')->nullable()->constrained('org_units')->nullOnDelete()->after('is_primary');
            }
        });

        // Permissões granulares por módulo (ler/criar/editar/excluir)
        Schema::table('user_module_access', function (Blueprint $t): void {
            if (!Schema::hasColumn('user_module_access', 'can_create')) {
                $t->boolean('can_create')->default(false)->after('can_manage_users');
            }
            if (!Schema::hasColumn('user_module_access', 'can_edit')) {
                $t->boolean('can_edit')->default(false)->after('can_create');
            }
            if (!Schema::hasColumn('user_module_access', 'can_delete')) {
                $t->boolean('can_delete')->default(false)->after('can_edit');
            }
        });
    }

    public function down(): void
    {
        Schema::table('tenant_user', function (Blueprint $t): void {
            $t->dropColumn('primary_org_unit_id');
        });
        Schema::table('user_module_access', function (Blueprint $t): void {
            $t->dropColumn(['can_create', 'can_edit', 'can_delete']);
        });
    }
};