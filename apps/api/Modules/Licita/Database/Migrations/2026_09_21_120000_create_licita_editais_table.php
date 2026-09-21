<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_editais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            // Equipe de planejamento própria (mesmo padrão das fases
            // anteriores: nasce como cópia da equipe do TR do processo,
            // editável independentemente dali em diante).
            $table->json('equipe_planejamento')->nullable();
            // Seções do Edital (art. 25 da Lei 14.133/2021) como colunas
            // próprias, todas nativas configuráveis desde o início (ver
            // CampoConfiguracaoService::CAMPOS_NATIVOS['edital']) — nenhuma
            // é NOT NULL, ao contrário do que DFD/ETP nasceram e precisaram
            // de migração posterior: o Edital já nasce com a obrigatoriedade
            // 100% a critério do tenant. `objeto`, `criterio_julgamento` e
            // `sancoes_administrativas` nascem copiados de DFD/TR (ver
            // EditalService::criar) — reaproveitam o que já foi elaborado
            // nas fases anteriores em vez do órgão redigitar do zero.
            $table->text('preambulo')->nullable();
            $table->text('objeto')->nullable();
            $table->string('criterio_julgamento')->nullable();
            $table->text('condicoes_participacao')->nullable();
            $table->text('requisitos_habilitacao')->nullable();
            $table->text('procedimento_sessao_publica')->nullable();
            $table->text('prazo_recursal')->nullable();
            $table->text('sancoes_administrativas')->nullable();
            $table->text('disposicoes_gerais')->nullable();
            $table->json('campos_extras')->nullable();
            $table->string('status')->default('rascunho');
            $table->foreignId('elaborado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Um processo tem no máximo um Edital ativo — mesma observação
            // das fases anteriores: garantido no EditalService::criar(), não
            // por índice único (MySQL não deduplica NULL em deleted_at).
            $table->index(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_editais');
    }
};
