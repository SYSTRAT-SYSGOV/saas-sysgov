<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_aula_agendamentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('cursos_turmas')->cascadeOnDelete();
            $table->foreignId('aula_id')->constrained('cursos_aulas')->cascadeOnDelete();
            $table->dateTime('inicio');
            $table->dateTime('fim');
            $table->timestamps();

            $table->unique(['turma_id', 'aula_id']);
            $table->index(['tenant_id', 'inicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_aula_agendamentos');
    }
};
