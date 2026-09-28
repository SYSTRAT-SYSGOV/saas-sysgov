<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_questoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->longText('enunciado');
            $table->decimal('pontuacao', 5, 2)->default(1);
            // Visível só para quem corrige (nunca vai ao participante).
            $table->text('orientacao_correcao')->nullable();
            $table->boolean('ativa')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'curso_id', 'ativa']);
        });

        Schema::create('cursos_questao_alternativas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('questao_id')->constrained('cursos_questoes')->cascadeOnDelete();
            $table->string('texto', 1000);
            $table->boolean('correta')->default(false);
            $table->unsignedTinyInteger('ordem')->default(1);
            $table->timestamps();

            $table->index(['tenant_id', 'questao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_questao_alternativas');
        Schema::dropIfExists('cursos_questoes');
    }
};
