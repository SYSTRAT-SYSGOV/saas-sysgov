<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Planos de Carreira ─────────────────────────────────────
        Schema::create('capd_planos_carreira', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 20);            // GERAL | MAGISTERIO
            $table->string('nome', 100);
            $table->string('lei_referencia', 100);   // Lei 1.704/2006 | Lei 1.835/2008
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ativo']);
            $table->unique(['tenant_id', 'codigo']);
        });

        // ── 2. Fatores de Avaliação (F1–F8) ──────────────────────────
        Schema::create('capd_fatores_avaliacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 10);            // F1 … F8
            $table->string('nome', 100);
            $table->text('descricao');
            $table->boolean('automatizado')->default(false); // F1/F2 = true
            $table->decimal('peso_geral', 4, 2);     // Pesos Lei 1.704/2006
            $table->decimal('peso_magisterio', 4, 2);// Pesos Lei 1.835/2008
            $table->integer('ordem')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ativo']);
            $table->unique(['tenant_id', 'codigo']);
        });

        // ── 3. Ciclos de Avaliação ────────────────────────────────────
        Schema::create('capd_ciclos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->integer('ano_referencia');
            $table->string('nome', 100);
            $table->date('data_inicio_avaliacao');
            $table->date('data_fim_avaliacao');
            $table->date('data_limite_recurso');
            // status: planejamento|em_avaliacao|recursivo|deliberacao|homologado|encerrado
            $table->string('status', 30)->default('planejamento');
            // Configuração F1/F2: 'manual' ou 'api'
            $table->string('modo_f1', 10)->default('manual');
            $table->string('modo_f2', 10)->default('manual');
            // Configuração de assinatura de atas: 'sha256' ou 'icp_brasil'
            $table->string('tipo_assinatura_ata', 20)->default('sha256');
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'ano_referencia']);
            $table->unique(['tenant_id', 'ano_referencia', 'nome']);
        });

        // ── 4. Diário de Bordo — Incidentes Críticos (CIT) ──────────
        Schema::create('capd_diario_bordo', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ciclo_id')->constrained('capd_ciclos')->cascadeOnDelete();
            // Servidor avaliado
            $table->foreignId('servidor_id')->constrained('users');
            // Avaliador (superior imediato)
            $table->foreignId('avaliador_id')->constrained('users');
            $table->foreignId('fator_id')->constrained('capd_fatores_avaliacao');
            // tipo: positivo | negativo
            $table->string('tipo', 10);
            $table->date('data_ocorrencia');
            $table->text('descricao_fato');
            // Ciência eletrônica do servidor avaliado
            $table->timestamp('ciencia_servidor_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'servidor_id', 'ciclo_id']);
            $table->index(['tenant_id', 'avaliador_id', 'ciclo_id']);
            $table->index(['tenant_id', 'fator_id', 'ciclo_id']);
        });

        // ── 5. Evidências Documentais do CIT ─────────────────────────
        Schema::create('capd_evidencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('diario_bordo_id')
                  ->constrained('capd_diario_bordo')
                  ->cascadeOnDelete();
            $table->string('nome_arquivo', 255);
            $table->string('url_armazenamento', 500);
            $table->string('hash_sha256', 64);       // Integridade do arquivo
            $table->string('mime_type', 50);         // PDF, PNG, JPG
            $table->unsignedBigInteger('tamanho_bytes')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'diario_bordo_id']);
        });

        // ── 6. Avaliações de Desempenho ───────────────────────────────
        Schema::create('capd_avaliacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ciclo_id')->constrained('capd_ciclos')->cascadeOnDelete();
            $table->foreignId('servidor_id')->constrained('users');
            $table->foreignId('avaliador_id')->constrained('users');
            // JSONB: {"F1":{"grau":4,"nota":7.5},"F2":{"grau":5,"nota":10.0},...}
            $table->json('respostas_fatores');
            // Nota final DECIMAL — NUNCA float
            $table->decimal('nota_final', 5, 2)->nullable();
            $table->boolean('elegivel_progressao')->nullable();
            $table->timestamp('data_conclusao')->nullable();
            $table->timestamp('ciencia_servidor_em')->nullable();
            // Após homologação: imutável (RN-C07)
            $table->boolean('homologada')->default(false);
            $table->timestamp('homologada_em')->nullable();
            $table->foreignId('homologada_por')->nullable()->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ciclo_id', 'homologada']);
            $table->unique(['tenant_id', 'ciclo_id', 'servidor_id']); // 1 avaliação por ciclo
            $table->index(['tenant_id', 'nota_final']);
        });

        // ── 7. Lançamentos Manuais F1/F2 ─────────────────────────────
        // Usados quando modo_f1/modo_f2 = 'manual' no ciclo
        Schema::create('capd_lancamentos_manuais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ciclo_id')->constrained('capd_ciclos')->cascadeOnDelete();
            $table->foreignId('servidor_id')->constrained('users');
            $table->foreignId('lancado_por')->constrained('users');
            // F1 ou F2
            $table->string('fator_codigo', 10);
            // Dados brutos do período
            $table->integer('faltas_injustificadas')->default(0);
            $table->integer('atrasos_injustificados')->default(0);
            $table->integer('penalidades_disciplinares')->default(0); // 0=nenhuma,1=advertência,2=suspensão
            // Grau calculado (1–5) e nota derivada
            $table->unsignedTinyInteger('grau_calculado');
            $table->decimal('nota_calculada', 4, 2);
            $table->text('observacao')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'ciclo_id', 'servidor_id']);
            $table->unique(['tenant_id', 'ciclo_id', 'servidor_id', 'fator_codigo'], 'capd_lanc_manual_unq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_lancamentos_manuais');
        Schema::dropIfExists('capd_avaliacoes');
        Schema::dropIfExists('capd_evidencias');
        Schema::dropIfExists('capd_diario_bordo');
        Schema::dropIfExists('capd_ciclos');
        Schema::dropIfExists('capd_fatores_avaliacao');
        Schema::dropIfExists('capd_planos_carreira');
    }
};
