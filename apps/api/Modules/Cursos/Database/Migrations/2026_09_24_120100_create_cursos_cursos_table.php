<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_cursos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo', 20)->default('curso');
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->unsignedInteger('carga_horaria_minutos');
            $table->string('capa_path')->nullable();
            $table->string('status', 20)->default('rascunho');
            // Critério de conclusão (design D4): nota_minima só passa a valer com as avaliações (Fase 2).
            $table->unsignedTinyInteger('frequencia_minima')->default(75);
            $table->decimal('nota_minima', 5, 2)->nullable();
            $table->foreignId('modelo_certificado_id')->nullable()->constrained('cursos_modelos_certificado')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_cursos');
    }
};
