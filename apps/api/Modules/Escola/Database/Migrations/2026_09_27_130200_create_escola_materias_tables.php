<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Matérias e o vínculo turma × matéria × professor (professor = usuário do tenant, design D6).
 * nome_normalizado sustenta a unicidade sem diferenciar maiúsculas e acentos (design D5).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escola_materias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('nome_normalizado', 150);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'nome_normalizado']);
        });

        Schema::create('escola_turma_materias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('escola_materias')->cascadeOnDelete();
            $table->foreignId('professor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'turma_id', 'materia_id']);
            $table->index(['tenant_id', 'professor_user_id']);
            $table->index(['tenant_id', 'materia_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escola_turma_materias');
        Schema::dropIfExists('escola_materias');
    }
};
