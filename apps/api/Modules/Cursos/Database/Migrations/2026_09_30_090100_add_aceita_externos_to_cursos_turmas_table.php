<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `aceita_externos` (design D11): turma aberta a participantes externos na inscrição pública.
 * Padrão falso — turmas existentes continuam fechadas a externos até o órgão decidir abrir cada
 * uma; o `InscricaoService` (tarefa 3.4) recusa a inscrição de externo em turma com isto falso.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_turmas', function (Blueprint $table): void {
            $table->boolean('aceita_externos')->default(false)->after('aprovacao_manual');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_turmas', function (Blueprint $table): void {
            $table->dropColumn('aceita_externos');
        });
    }
};
