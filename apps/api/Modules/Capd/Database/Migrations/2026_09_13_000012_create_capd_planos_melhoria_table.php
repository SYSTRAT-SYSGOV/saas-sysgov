<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RF-09: Plano de Melhoria de Desempenho (PMD).
 *
 * Criado quando o servidor atinge NFC abaixo da nota de corte do ciclo.
 * Vinculado ao próximo ciclo avaliativo como fator de verificação de evolução.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_planos_melhoria', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            // Avaliação (ou consolidação trienal) que originou o PMD
            $table->unsignedBigInteger('avaliacao_id')->nullable();
            $table->unsignedBigInteger('servidor_id');
            // Ciclo no qual a nota abaixo do corte foi identificada
            $table->unsignedBigInteger('ciclo_id');
            // Ciclo de verificação de evolução (próximo ciclo da cadência)
            $table->unsignedBigInteger('ciclo_verificacao_id')->nullable();
            // NFC que disparou a criação do PMD (DECIMAL para não usar float — RN)
            $table->decimal('nfc_gatilho', 5, 2);
            // Texto livre de objetivos de melhoria pactuados
            $table->text('objetivos');
            // JSON com as ações de capacitação/melhoria planejadas
            $table->json('acoes')->nullable();
            $table->date('prazo');
            // pendente | em_andamento | concluido | cancelado
            $table->string('status', 30)->default('pendente');
            $table->timestamp('concluido_em')->nullable();
            // Observações da Comissão na verificação
            $table->text('observacoes_verificacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('avaliacao_id')
                ->references('id')
                ->on('capd_avaliacoes')
                ->nullOnDelete();

            $table->foreign('ciclo_id')
                ->references('id')
                ->on('capd_ciclos')
                ->restrictOnDelete();

            $table->foreign('ciclo_verificacao_id')
                ->references('id')
                ->on('capd_ciclos')
                ->nullOnDelete();

            $table->index(['tenant_id', 'servidor_id', 'status']);
            $table->index(['tenant_id', 'ciclo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_planos_melhoria');
    }
};
