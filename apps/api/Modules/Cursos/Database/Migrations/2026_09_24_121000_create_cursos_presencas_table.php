<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_presencas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('agendamento_id')->constrained('cursos_aula_agendamentos')->cascadeOnDelete();
            $table->foreignId('inscricao_id')->constrained('cursos_inscricoes')->cascadeOnDelete();
            $table->boolean('presente');
            $table->string('origem', 20);
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['agendamento_id', 'inscricao_id']);
            $table->index(['tenant_id', 'inscricao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_presencas');
    }
};
