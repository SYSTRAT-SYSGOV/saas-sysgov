<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['revenues', 'expenses'] as $table) {
            Schema::table($table, function (Blueprint $t) use ($table): void {
                $t->foreignId('pessoa_id')->nullable()->after('tenant_id')->constrained('pessoas')->nullOnDelete();
                $t->index(['tenant_id', 'pessoa_id'], "{$table}_tenant_pessoa_idx");
            });
        }
    }

    public function down(): void
    {
        foreach (['revenues', 'expenses'] as $table) {
            Schema::table($table, function (Blueprint $t) use ($table): void {
                $t->dropIndex("{$table}_tenant_pessoa_idx");
                $t->dropConstrainedForeignId('pessoa_id');
            });
        }
    }
};
