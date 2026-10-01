<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Formulário de inscrição configurável por curso (design D9): `cursos_campos_inscricao` define
 * os campos extras, `cursos_inscricao_respostas` guarda as respostas com `rotulo`/`tipo` em
 * snapshot (mesmo padrão de `cursos_respostas`/`cursos_tentativas` da Fase 2 — editar o campo
 * depois não reescreve o que já foi respondido). Campo com resposta não é excluído, só
 * desativado: por isso `campo_id` é `restrictOnDelete`, enquanto `inscricao_id` é
 * `cascadeOnDelete` (a resposta não tem vida própria fora da inscrição).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_campos_inscricao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            $table->string('rotulo', 160);
            $table->string('tipo', 20);
            $table->boolean('obrigatorio')->default(false);
            $table->json('opcoes')->nullable();
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'curso_id', 'ativo']);
        });

        Schema::create('cursos_inscricao_respostas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('inscricao_id')->constrained('cursos_inscricoes')->cascadeOnDelete();
            $table->foreignId('campo_id')->constrained('cursos_campos_inscricao')->restrictOnDelete();
            $table->string('rotulo', 160);
            $table->string('tipo', 20);
            $table->text('valor')->nullable();
            $table->timestamps();

            $table->unique(['inscricao_id', 'campo_id']);
            $table->index(['tenant_id', 'campo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_inscricao_respostas');
        Schema::dropIfExists('cursos_campos_inscricao');
    }
};
