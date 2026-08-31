<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_user', function (Blueprint $t): void {
            if (!Schema::hasColumn('role_user', 'tenant_id')) {
                $t->foreignId('tenant_id')
                    ->nullable()
                    ->constrained('tenants')
                    ->nullOnDelete()
                    ->after('user_id');
            }
            if (!Schema::hasIndex('role_user', ['tenant_id', 'role_id'])) {
                $t->index(['tenant_id', 'role_id']);
            }
        });

        // Backfill: vínculos existentes herdam o tenant da própria role (RN-CORE-001)
        // Portável (MySQL + SQLite): lê o mapeamento e atualiza por linha.
        $mappings = \Illuminate\Support\Facades\DB::table('role_user')
            ->join('roles', 'roles.id', '=', 'role_user.role_id')
            ->whereNull('role_user.tenant_id')
            ->whereNotNull('roles.tenant_id')
            ->select(['role_user.role_id', 'role_user.user_id', 'roles.tenant_id'])
            ->get();

        foreach ($mappings as $mapping) {
            \Illuminate\Support\Facades\DB::table('role_user')
                ->where('role_id', $mapping->role_id)
                ->where('user_id', $mapping->user_id)
                ->update(['tenant_id' => $mapping->tenant_id]);
        }
    }

    public function down(): void
    {
        Schema::table('role_user', function (Blueprint $t): void {
            if (Schema::hasIndex('role_user', ['tenant_id', 'role_id'])) {
                $t->dropIndex(['tenant_id', 'role_id']);
            }
            if (Schema::hasColumn('role_user', 'tenant_id')) {
                $t->dropColumn('tenant_id');
            }
        });
    }
};
