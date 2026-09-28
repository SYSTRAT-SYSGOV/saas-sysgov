<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_inscricoes', function (Blueprint $table): void {
            // Apurada no encerramento da turma, junto com a frequência (design D9 da Fase 2).
            $table->decimal('nota_apurada', 5, 2)->nullable()->after('frequencia_apurada');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_inscricoes', function (Blueprint $table): void {
            $table->dropColumn('nota_apurada');
        });
    }
};
