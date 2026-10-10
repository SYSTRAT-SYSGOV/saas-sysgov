<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fase 2 (aditiva): a ata guarda os textos editados e as assinaturas desenhadas no painel (antes no localStorage);
 * a ocorrência guarda o responsável informado na ficha do aluno (texto livre).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedagogico_atas', function (Blueprint $table): void {
            $table->longText('texto_introducao')->nullable()->after('secretaria');
            $table->longText('texto_conclusao')->nullable()->after('texto_introducao');
            $table->json('assinaturas')->nullable()->after('deliberacoes');
        });

        Schema::table('pedagogico_ocorrencias', function (Blueprint $table): void {
            $table->string('responsavel', 200)->nullable()->after('severidade');
        });
    }

    public function down(): void
    {
        Schema::table('pedagogico_ocorrencias', function (Blueprint $table): void {
            $table->dropColumn('responsavel');
        });

        Schema::table('pedagogico_atas', function (Blueprint $table): void {
            $table->dropColumn(['texto_introducao', 'texto_conclusao', 'assinaturas']);
        });
    }
};
