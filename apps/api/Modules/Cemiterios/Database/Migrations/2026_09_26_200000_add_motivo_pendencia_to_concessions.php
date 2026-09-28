<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('concessions', 'motivo_pendencia')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->string('motivo_pendencia')->nullable()->after('pendencia_regularizacao');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('concessions', 'motivo_pendencia')) {
            Schema::table('concessions', function (Blueprint $table): void {
                $table->dropColumn('motivo_pendencia');
            });
        }
    }
};