<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_servidor_afastamentos', function (Blueprint $table): void {
            $table->foreignId('substituto_id')
                ->nullable()
                ->after('dias_afastado')
                ->constrained('capd_servidores')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('capd_servidor_afastamentos', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('substituto_id');
        });
    }
};
