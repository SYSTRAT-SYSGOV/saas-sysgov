<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_dfds', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            $table->date('data_previsao');
            $table->string('grau_prioridade');
            $table->text('justificativa');
            $table->string('objeto', 500);
            $table->boolean('previsao_pca')->default(false);
            $table->string('numero_pca')->nullable();
            $table->string('area_requisitante')->nullable();
            $table->json('equipe_planejamento')->nullable();
            $table->string('status')->default('rascunho');
            $table->boolean('gerado_por_ia')->default(false);
            $table->foreignId('elaborado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Um processo tem no máximo um DFD ativo — MySQL não suporta índice
            // único parcial (NULL em deleted_at não é deduplicado), então essa
            // regra é garantida no DfdService::criar(), não aqui.
            $table->index(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_dfds');
    }
};
