<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_inscricoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('cursos_turmas')->restrictOnDelete();
            $table->foreignId('participante_id')->constrained('cursos_participantes')->restrictOnDelete();
            $table->string('status', 20);
            $table->foreignId('inscrito_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovada_em')->nullable();
            $table->foreignId('cancelada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelada_em')->nullable();
            $table->string('motivo_cancelamento', 500)->nullable();
            // Apurada no encerramento da turma (design D10).
            $table->decimal('frequencia_apurada', 5, 2)->nullable();
            $table->timestamp('concluida_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'turma_id', 'status']);
            $table->index(['tenant_id', 'participante_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_inscricoes');
    }
};
