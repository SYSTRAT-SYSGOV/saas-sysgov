<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Módulo Transporte, Fase 3 (change transporte-fase-3-alocacao-de-alunos). A unicidade da alocação ativa (aluno × rota)
 * fica no Service, sob o lock da rota (design D17): a expressão de coluna gerada não é portável para o SQLite dos testes.
 * `necessidade_observacao` é dado de saúde de criança (LGPD, art. 11): ver design D22.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_alocacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->restrictOnDelete();
            $table->foreignId('rota_id')->constrained('transporte_rotas')->restrictOnDelete();
            $table->foreignId('parada_id')->constrained('transporte_paradas')->restrictOnDelete();
            $table->string('turno', 10);
            $table->boolean('usa_transporte_rural')->default(true);
            $table->unsignedTinyInteger('poder_publico')->nullable();
            $table->boolean('necessidade_especial')->default(false);
            $table->text('necessidade_observacao')->nullable();
            $table->boolean('atendimento_curricular')->default(true);
            $table->string('mediacao_didatica', 20)->default('presencial');
            $table->char('pais_residencia', 2)->default('BR');
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->string('motivo_fim', 255)->nullable();
            $table->text('justificativa_excesso')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'rota_id', 'data_fim'], 'tr_aloc_t_rota_fim_ix');
            $table->index(['tenant_id', 'aluno_id'], 'tr_aloc_t_aluno_ix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporte_alocacoes');
    }
};
