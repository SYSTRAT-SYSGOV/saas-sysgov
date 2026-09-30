<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('tenant_id')->constrained('pessoas')->nullOnDelete();
            $table->index(['tenant_id', 'pessoa_id'], 'ch_tenant_pessoa_idx');
        });

        Schema::table('deceased_records', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('tenant_id')->constrained('pessoas')->nullOnDelete();
            $table->index(['tenant_id', 'pessoa_id'], 'dr_tenant_pessoa_idx');
        });

        Schema::table('sucessao_herdeiros', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('sucessao_id')->constrained('pessoas')->nullOnDelete();
            $table->index(['tenant_id', 'pessoa_id'], 'sh_tenant_pessoa_idx');
        });
    }

    public function down(): void
    {
        Schema::table('sucessao_herdeiros', function (Blueprint $table): void {
            $table->dropIndex('sh_tenant_pessoa_idx');
            $table->dropConstrainedForeignId('pessoa_id');
        });

        Schema::table('deceased_records', function (Blueprint $table): void {
            $table->dropIndex('dr_tenant_pessoa_idx');
            $table->dropConstrainedForeignId('pessoa_id');
        });

        Schema::table('concession_holders', function (Blueprint $table): void {
            $table->dropIndex('ch_tenant_pessoa_idx');
            $table->dropConstrainedForeignId('pessoa_id');
        });
    }
};
