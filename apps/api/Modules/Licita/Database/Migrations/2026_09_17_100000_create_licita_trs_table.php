<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_trs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            // Equipe de planejamento própria (mesmo padrão das fases
            // anteriores: nasce como cópia da equipe da Pesquisa de Preços
            // do processo, editável independentemente dali em diante).
            $table->json('equipe_planejamento')->nullable();
            // Seções do Termo de Referência (art. 6º, XXIII da Lei
            // 14.133/2021) como colunas próprias — diferente do ETP (texto
            // único), aqui cada seção é editada e impressa separadamente.
            $table->text('fundamentacao_contratacao')->nullable();
            $table->text('descricao_solucao')->nullable();
            $table->text('requisitos_contratacao')->nullable();
            $table->text('modelo_execucao')->nullable();
            $table->text('modelo_gestao_contrato')->nullable();
            $table->string('criterio_julgamento')->nullable();
            $table->text('obrigacoes_contratante')->nullable();
            $table->text('obrigacoes_contratada')->nullable();
            $table->text('sancoes_administrativas')->nullable();
            $table->string('vigencia_contrato')->nullable();
            $table->text('adequacao_orcamentaria')->nullable();
            $table->json('campos_extras')->nullable();
            $table->string('status')->default('rascunho');
            $table->foreignId('elaborado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Um processo tem no máximo um TR ativo — mesma observação das
            // fases anteriores: garantido no TrService::criar(), não por
            // índice único (MySQL não deduplica NULL em deleted_at).
            $table->index(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_trs');
    }
};
