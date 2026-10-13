<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vistoria_ordens_servico', function (Blueprint $table): void {
            // Preenchido quando a vistoria é concluída (ver Requirement "Execução de
            // vistoria em campo" e "Tramitação do processo administrativo sancionatório").
            $table->string('resultado', 15)->nullable()->after('status'); // regular, irregular
        });
    }

    public function down(): void
    {
        Schema::table('vistoria_ordens_servico', function (Blueprint $table): void {
            $table->dropColumn('resultado');
        });
    }
};
