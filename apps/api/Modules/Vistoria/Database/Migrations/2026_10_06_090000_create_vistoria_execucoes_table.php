<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_execucoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ordem_servico_id')->constrained('vistoria_ordens_servico')->cascadeOnDelete();
            $table->foreignId('fiscal_id')->constrained('users')->cascadeOnDelete();
            $table->uuid('client_uuid');
            $table->string('status', 20)->default('sincronizada'); // pendente_sincronizacao, sincronizada, suplementar
            $table->json('dados')->nullable(); // payload coletado em campo — estrutura detalhada nas seções 5/7/8
            $table->timestamp('iniciado_em_dispositivo')->nullable();
            $table->timestamp('concluido_em_dispositivo')->nullable();
            $table->timestamp('sincronizado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'client_uuid'], 'vistoria_execucao_client_uuid_unq');
            $table->index(['tenant_id', 'ordem_servico_id']);
            $table->index(['tenant_id', 'fiscal_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_execucoes');
    }
};
