<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_modelos_formulario', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo_fiscalizacao', 60); // producao_animal, producao_vegetal, agroindustria, comercio_insumos, outro (mesmo domínio de vistoria_locais.classificacao_atividade)
            $table->string('nome', 150);
            $table->text('descricao')->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'tipo_fiscalizacao', 'ativo']);
        });

        Schema::create('vistoria_perguntas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('modelo_id')->constrained('vistoria_modelos_formulario')->cascadeOnDelete();
            $table->text('enunciado');
            $table->string('tipo', 20); // multipla_escolha, texto_livre, foto
            $table->json('opcoes')->nullable()->comment('Alternativas disponíveis quando tipo = multipla_escolha');
            $table->boolean('obrigatoria')->default(true);
            $table->unsignedInteger('ordem')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'modelo_id', 'ativo']);
        });

        Schema::create('vistoria_respostas_checklist', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('execucao_id')->constrained('vistoria_execucoes')->cascadeOnDelete();
            $table->foreignId('pergunta_id')->constrained('vistoria_perguntas')->cascadeOnDelete();
            $table->json('valor')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('capturado_em')->nullable()->comment('Momento do registro da resposta no dispositivo');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'execucao_id', 'pergunta_id'], 'vistoria_resposta_execucao_pergunta_unq');
            $table->index(['tenant_id', 'execucao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_respostas_checklist');
        Schema::dropIfExists('vistoria_perguntas');
        Schema::dropIfExists('vistoria_modelos_formulario');
    }
};
