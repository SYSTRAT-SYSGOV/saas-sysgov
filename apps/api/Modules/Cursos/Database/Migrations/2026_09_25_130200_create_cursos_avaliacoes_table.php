<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_avaliacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            // Aula excluída não apaga a avaliação: a regra "no início da aula" passa a aguardar agendamento.
            $table->foreignId('aula_id')->nullable()->constrained('cursos_aulas')->nullOnDelete();
            $table->string('titulo');
            $table->text('instrucoes')->nullable();
            $table->unsignedTinyInteger('peso')->default(1);
            $table->unsignedTinyInteger('tentativas_max')->default(1);
            $table->unsignedSmallInteger('tempo_limite_minutos')->nullable();
            $table->boolean('publicada')->default(false);
            $table->string('liberacao_regra', 20)->default('imediata');
            $table->unsignedSmallInteger('liberacao_dias')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'curso_id', 'publicada']);
        });

        Schema::create('cursos_avaliacao_questoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('avaliacao_id')->constrained('cursos_avaliacoes')->cascadeOnDelete();
            // Questão em uso numa avaliação não pode ser excluída.
            $table->foreignId('questao_id')->constrained('cursos_questoes')->restrictOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->timestamps();

            $table->unique(['avaliacao_id', 'questao_id']);
            $table->index(['tenant_id', 'avaliacao_id', 'ordem']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_avaliacao_questoes');
        Schema::dropIfExists('cursos_avaliacoes');
    }
};
