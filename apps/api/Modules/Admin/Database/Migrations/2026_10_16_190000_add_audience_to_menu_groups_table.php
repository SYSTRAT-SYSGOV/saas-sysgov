<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Separa os grupos do menu do painel admin ('admin') dos grupos criados pelo registro de módulos
 * ('module'), que representam telas do portal do cliente e não pertencem ao menu lateral do admin.
 */
return new class extends Migration {
    public function up(): void
    {
        if (!Schema::hasColumn('menu_groups', 'audience')) {
            Schema::table('menu_groups', function (Blueprint $table) {
                $table->string('audience', 20)->default('admin')->after('slug');
                $table->index('audience');
            });
        }

        // Grupos sem nenhum item de rota administrativa (admin_*/module_catalog) vieram do registro de módulos.
        $adminGroupIds = DB::table('menu_items')
            ->where(fn ($q) => $q->where('route', 'like', 'admin_%')->orWhere('route', 'module_catalog'))
            ->select('menu_group_id');

        DB::table('menu_groups')->whereNotIn('id', $adminGroupIds)->update(['audience' => 'module']);
    }

    public function down(): void
    {
        if (Schema::hasColumn('menu_groups', 'audience')) {
            Schema::table('menu_groups', function (Blueprint $table) {
                $table->dropIndex(['audience']);
                $table->dropColumn('audience');
            });
        }
    }
};
