<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('user_module_access', function (Blueprint $t): void {
            if (!Schema::hasColumn('user_module_access', 'valid_from')) {
                $t->timestamp('valid_from')->nullable()->after('can_manage_users');
            }
            if (!Schema::hasColumn('user_module_access', 'valid_to')) {
                $t->timestamp('valid_to')->nullable()->after('valid_from');
            }
            if (!Schema::hasColumn('user_module_access', 'status')) {
                $t->string('status')->default('active')->after('valid_to');
            }
            if (!Schema::hasColumn('user_module_access', 'granted_by')) {
                $t->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete()->after('status');
            }
            $t->index(['tenant_id', 'status'], 'uma_tenant_status_idx');
            $t->index(['tenant_id', 'valid_to'], 'uma_tenant_validto_idx');
        });
    }

    public function down(): void
    {
        Schema::table('user_module_access', function (Blueprint $t): void {
            $t->dropIndex('uma_tenant_status_idx');
            $t->dropIndex('uma_tenant_validto_idx');
            $t->dropColumn(['valid_from', 'valid_to', 'status', 'granted_by']);
        });
    }
};