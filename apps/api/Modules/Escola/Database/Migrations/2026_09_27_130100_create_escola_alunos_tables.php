<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Alunos e contatos. Excluir a turma deixa o aluno sem turma (turma_id nulo), nunca apaga o aluno.
 * CGM único por tenant é validado na aplicação por causa do soft delete (design D4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escola_alunos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->nullable()->constrained('escola_turmas')->nullOnDelete();
            $table->foreignId('turma_origem_id')->nullable()->constrained('escola_turmas')->nullOnDelete();
            $table->unsignedSmallInteger('numero')->nullable();
            $table->string('nome', 200);
            $table->string('cgm', 50)->nullable();
            $table->date('nascimento')->nullable();
            $table->string('mae', 200)->nullable();
            $table->string('pai', 200)->nullable();
            $table->string('foto_path')->nullable();
            $table->string('situacao', 20)->default('ativo');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'turma_id', 'numero']);
            $table->index(['tenant_id', 'cgm']);
            $table->index(['tenant_id', 'nome']);
            $table->index(['tenant_id', 'situacao']);
        });

        Schema::create('escola_aluno_contatos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->string('telefone', 30);
            $table->string('descricao', 100)->nullable();
            $table->unsignedTinyInteger('ordem')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'aluno_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escola_aluno_contatos');
        Schema::dropIfExists('escola_alunos');
    }
};
