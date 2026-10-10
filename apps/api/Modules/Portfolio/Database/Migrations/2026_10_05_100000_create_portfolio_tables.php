<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('portfolio_trabalhos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas');
            $table->foreignId('aluno_id')->constrained('escola_alunos');
            $table->foreignId('turma_id')->constrained('escola_turmas');
            $table->foreignId('materia_id')->constrained('escola_materias');
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('trimestre')->nullable();
            $table->string('titulo', 160);
            $table->text('descricao')->nullable();
            $table->text('observacoes')->nullable();
            $table->date('data');
            $table->unsignedTinyInteger('avaliacao_decimos');
            $table->foreignId('registrado_por')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'escola_id', 'aluno_id', 'ano_letivo', 'data'], 'portfolio_trab_aluno_idx');
            $table->index(['tenant_id', 'escola_id', 'turma_id', 'materia_id'], 'portfolio_trab_turma_idx');
        });

        Schema::create('portfolio_imagens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('trabalho_id')->constrained('portfolio_trabalhos')->cascadeOnDelete();
            $table->string('path', 300);
            $table->string('nome_original', 250);
            $table->string('mime', 50);
            $table->unsignedInteger('tamanho');
            $table->unsignedTinyInteger('ordem');
            $table->timestamps();

            $table->index(['tenant_id', 'trabalho_id', 'ordem'], 'portfolio_img_trab_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('portfolio_imagens');
        Schema::dropIfExists('portfolio_trabalhos');
    }
};
