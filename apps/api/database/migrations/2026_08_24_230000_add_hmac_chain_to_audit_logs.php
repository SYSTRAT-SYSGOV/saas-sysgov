<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            if (!Schema::hasColumn('audit_logs', 'hash')) {
                $table->string('hash', 64)->nullable()->after('user_agent');
            }
            if (!Schema::hasColumn('audit_logs', 'prev_hash')) {
                $table->string('prev_hash', 64)->nullable()->after('hash');
            }
            $table->index(['hash', 'prev_hash']);
        });
    }

    public function down(): void
    {
        Schema::table('audit_logs', function (Blueprint $table): void {
            $table->dropIndex(['hash', 'prev_hash']);
            $table->dropColumn(['hash', 'prev_hash']);
        });
    }
};