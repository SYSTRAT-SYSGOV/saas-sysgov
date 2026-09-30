<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemetery_contractors', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('tenant_id')->constrained('pessoas')->nullOnDelete();
            $table->index(['tenant_id', 'pessoa_id'], 'cc_tenant_pessoa_idx');
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_contractors', function (Blueprint $table): void {
            $table->dropIndex('cc_tenant_pessoa_idx');
            $table->dropConstrainedForeignId('pessoa_id');
        });
    }
};
