<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_tentativas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            // Tentativa é histórico de nota: nem a avaliação nem a inscrição podem sumir com ela.
            $table->foreignId('avaliacao_id')->constrained('cursos_avaliacoes')->restrictOnDelete();
            $table->foreignId('inscricao_id')->constrained('cursos_inscricoes')->restrictOnDelete();
            $table->unsignedTinyInteger('numero');
            $table->string('status', 20);
            $table->timestamp('iniciada_em');
            $table->timestamp('prazo_em')->nullable();
            $table->timestamp('enviada_em')->nullable();
            $table->timestamp('corrigida_em')->nullable();
            $table->decimal('nota', 5, 2)->nullable();
            // Snapshot das questões no início (enunciado, pontuação, alternativas e gabarito): design D6.
            $table->json('questoes');
            $table->timestamps();

            $table->unique(['avaliacao_id', 'inscricao_id', 'numero']);
            $table->index(['tenant_id', 'inscricao_id']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('cursos_respostas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('tentativa_id')->constrained('cursos_tentativas')->cascadeOnDelete();
            $table->foreignId('questao_id')->constrained('cursos_questoes')->restrictOnDelete();
            // Sem FK: a alternativa escolhida é conferida pelo snapshot da tentativa, e editar a questão recria alternativas.
            $table->unsignedBigInteger('alternativa_id')->nullable();
            $table->text('texto')->nullable();
            $table->decimal('pontos', 5, 2)->nullable();
            $table->text('comentario')->nullable();
            $table->foreignId('corrigida_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('corrigida_em')->nullable();
            $table->timestamps();

            $table->unique(['tentativa_id', 'questao_id']);
            $table->index(['tenant_id', 'questao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_respostas');
        Schema::dropIfExists('cursos_tentativas');
    }
};
