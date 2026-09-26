<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_certificados', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            // Único em TODA a plataforma (não composto por tenant): é o que permite a
            // validação pública sem saber o órgão — única exceção à regra de
            // unicidade composta (design D7).
            $table->string('codigo', 12)->unique();
            $table->string('tipo', 20);
            $table->foreignId('participante_id')->constrained('cursos_participantes')->restrictOnDelete();
            $table->foreignId('inscricao_id')->nullable()->unique()->constrained('cursos_inscricoes')->restrictOnDelete();
            $table->foreignId('formacao_id')->nullable()->constrained('cursos_formacoes')->restrictOnDelete();
            $table->foreignId('modelo_id')->nullable()->constrained('cursos_modelos_certificado')->nullOnDelete();
            // Snapshot congelado na emissão (design D8).
            $table->json('dados');
            $table->timestamp('emitido_em');
            $table->timestamp('revogado_em')->nullable();
            $table->foreignId('revogado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('motivo_revogacao', 500)->nullable();
            $table->timestamps();

            $table->unique(['formacao_id', 'participante_id']);
            $table->index(['tenant_id', 'participante_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_certificados');
    }
};
