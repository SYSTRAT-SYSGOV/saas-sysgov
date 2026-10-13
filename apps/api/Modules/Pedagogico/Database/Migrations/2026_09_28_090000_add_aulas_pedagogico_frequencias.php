<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 2 (aditiva): quantidade de aulas que a chamada do dia representa — cada falta vale essa quantidade
 * no total de faltas do aluno (o "multiplicador" da tela de frequência).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedagogico_frequencias', function (Blueprint $table): void {
            $table->unsignedTinyInteger('aulas')->default(1)->after('presenca');
        });
    }

    public function down(): void
    {
        Schema::table('pedagogico_frequencias', function (Blueprint $table): void {
            $table->dropColumn('aulas');
        });
    }
};
