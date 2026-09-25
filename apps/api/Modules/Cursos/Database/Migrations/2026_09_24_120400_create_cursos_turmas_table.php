<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_turmas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->dateTime('inscricoes_inicio');
            $table->dateTime('inscricoes_fim');
            $table->unsignedInteger('vagas');
            $table->string('modalidade', 20);
            $table->string('local')->nullable();
            $table->string('link', 500)->nullable();
            $table->boolean('aprovacao_manual')->default(false);
            $table->string('status', 20)->default('aberta');
            $table->timestamp('encerrada_em')->nullable();
            $table->foreignId('encerrada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'curso_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_turmas');
    }
};
