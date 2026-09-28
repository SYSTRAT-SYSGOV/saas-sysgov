<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Parâmetros legais por município, versionados e append-only (ADR-003).
        Schema::create('cemetery_settings', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->dateTime('vigencia_inicio');
            $table->unsignedTinyInteger('prazo_exumacao_adulto_anos');
            $table->unsignedTinyInteger('prazo_exumacao_crianca_anos');
            $table->unsignedTinyInteger('idade_limite_crianca');
            $table->decimal('distanciamento_min_m', 5, 2);
            $table->decimal('tumulo_max_comprimento_m', 5, 2);
            $table->decimal('tumulo_max_largura_m', 5, 2);
            $table->unsignedSmallInteger('edital_prazo_dias');
            $table->unsignedTinyInteger('obras_simultaneas_max');
            $table->unsignedSmallInteger('notificacao_antecedencia_dias');
            $table->unsignedTinyInteger('suspensoes_para_cancelamento');
            $table->unsignedTinyInteger('concessao_temporaria_anos');
            $table->text('instrucoes_pagamento')->nullable();
            $table->string('chave_pix')->nullable();
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();

            // Duas versões no mesmo segundo são possíveis; a de maior id vence.
            $table->index(['tenant_id', 'vigencia_inicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_settings');
    }
};
