<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenant_user', function (Blueprint $table): void {
            $table->string('status')->default('active')->after('role_id'); // active | inactive
            $table->boolean('is_primary')->default(false)->after('status');
            
            // Ensure unique constraint on tenant_id, user_id
            $table->unique(['tenant_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::table('tenant_user', function (Blueprint $table): void {
            $table->dropColumn(['status', 'is_primary']);
            $table->dropUnique(['tenant_id', 'user_id']);
        });
    }
};
