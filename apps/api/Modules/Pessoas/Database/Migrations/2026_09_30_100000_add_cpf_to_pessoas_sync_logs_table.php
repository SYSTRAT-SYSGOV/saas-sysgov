<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas_sync_logs', function (Blueprint $table): void {
            $table->text('cpf')->nullable()->after('integracao_id');
        });
    }

    public function down(): void
    {
        Schema::table('pessoas_sync_logs', function (Blueprint $table): void {
            $table->dropColumn('cpf');
        });
    }
};
