<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Tipos de Instrumento ─────────────────────────────────────
        Schema::create('requerimentos_tipos_instrumento', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('slug', 100);
            $table->string('descricao', 255)->nullable();
            $table->string('poder_origem', 20);
            $table->integer('prazo_regimental_dias')->nullable();
            $table->json('campos_especificos')->nullable();
            $table->boolean('exige_tramitacao_interna')->default(false);
            $table->boolean('ativo')->default(true);
            $table->integer('ordem')->default(0);
            $table->timestamps();
            $table->unique(['tenant_id', 'slug'], 'req_tipo_slug_unq');
            $table->index(['tenant_id', 'ativo']);
        });

        // ── 2. Contadores ──────────────────────────────────────────────
        Schema::create('requerimentos_contadores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo_slug', 100);
            $table->integer('exercicio');
            $table->integer('ultimo_numero')->default(0);
            $table->timestamps();
            $table->unique(['tenant_id', 'tipo_slug', 'exercicio'], 'req_contador_unq');
        });

        // ── 3. Proposições ─────────────────────────────────────────────
        Schema::create('requerimentos_proposicoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('tipo_instrumento_id')->constrained('requerimentos_tipos_instrumento');
            $table->string('numero', 50);
            $table->integer('numero_sequencial');
            $table->integer('exercicio');
            $table->string('ementa', 500);
            $table->text('justificativa')->nullable();
            $table->text('conteudo')->nullable();
            $table->string('area_tematica', 100)->nullable();
            $table->string('dispositivos_legais', 500)->nullable();
            $table->string('poder_origem', 20);
            $table->unsignedBigInteger('autor_principal_id');
            $table->string('partido_bancada', 100)->nullable();
            $table->string('status', 40)->default('protocolado');
            $table->boolean('visibilidade_publica')->default(true);
            $table->unsignedBigInteger('vinculacao_proposicao_id')->nullable();
            $table->unsignedBigInteger('vinculacao_processo_id')->nullable();
            $table->json('dados_pessoais')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['tenant_id', 'status'], 'req_prop_status_idx');
            $table->index(['tenant_id', 'exercicio'], 'req_prop_exercicio_idx');
            $table->index(['tenant_id', 'tipo_instrumento_id', 'exercicio'], 'req_prop_tipo_exer_idx');
            $table->index(['tenant_id', 'autor_principal_id'], 'req_prop_autor_idx');
            $table->unique(['tenant_id', 'tipo_instrumento_id', 'numero_sequencial', 'exercicio'], 'req_prop_unq');
        });

        // ── 4. Autores ─────────────────────────────────────────────────
        Schema::create('requerimentos_autores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proposicao_id')->constrained('requerimentos_proposicoes')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->string('tipo_autor', 30);
            $table->integer('ordem')->default(0);
            $table->timestamps();
            $table->index(['tenant_id', 'proposicao_id'], 'req_aut_prop_idx');
            $table->index(['tenant_id', 'user_id'], 'req_aut_user_idx');
        });

        // ── 5. Anexos ─────────────────────────────────────────────────
        Schema::create('requerimentos_anexos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedBigInteger('anexavel_id');
            $table->string('anexavel_type', 100);
            $table->string('nome_arquivo', 255);
            $table->string('url_armazenamento', 500);
            $table->string('hash_sha256', 64);
            $table->string('mime_type', 50);
            $table->unsignedBigInteger('tamanho_bytes')->default(0);
            $table->unsignedBigInteger('uploaded_by');
            $table->timestamps();
            $table->index(['tenant_id', 'anexavel_id', 'anexavel_type'], 'req_anex_entidade_idx');
        });

        // ── 6. Vinculações ─────────────────────────────────────────────
        Schema::create('requerimentos_vinculacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proposicao_origem_id')->constrained('requerimentos_proposicoes')->cascadeOnDelete();
            $table->foreignId('proposicao_destino_id')->constrained('requerimentos_proposicoes')->cascadeOnDelete();
            $table->string('tipo_vinculacao', 30);
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'proposicao_origem_id'], 'req_vinc_origem_idx');
            $table->index(['tenant_id', 'proposicao_destino_id'], 'req_vinc_destino_idx');
            $table->unique(['proposicao_origem_id', 'proposicao_destino_id'], 'req_vinc_unq');
        });

        // ── 7. Tramitações entre Poderes ────────────────────────────────
        Schema::create('requerimentos_tramitacoes_poderes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proposicao_id')->constrained('requerimentos_proposicoes')->cascadeOnDelete();
            $table->string('poder_origem', 20);
            $table->string('poder_destino', 20);
            $table->unsignedBigInteger('remetente_id');
            $table->unsignedBigInteger('responsavel_id')->nullable();
            $table->date('data_encaminhamento');
            $table->date('data_recebimento')->nullable();
            $table->date('data_limite_resposta');
            $table->string('status', 30)->default('encaminhado');
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'proposicao_id'], 'req_tp_prop_idx');
            $table->index(['tenant_id', 'status'], 'req_tp_status_idx');
            $table->index(['tenant_id', 'data_limite_resposta'], 'req_tp_limite_idx');
        });

        // ── 8. Respostas ──────────────────────────────────────────────
        Schema::create('requerimentos_respostas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('tramitacao_id')->constrained('requerimentos_tramitacoes_poderes')->cascadeOnDelete();
            $table->unsignedBigInteger('elaborado_por');
            $table->text('conteudo');
            $table->string('status', 20)->default('rascunho');
            $table->timestamp('enviado_em')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'tramitacao_id'], 'req_resp_tramit_idx');
        });

        // ── 9. Workflows ──────────────────────────────────────────────
        Schema::create('requerimentos_workflows', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('tipo_instrumento_id')->constrained('requerimentos_tipos_instrumento')->cascadeOnDelete();
            $table->unsignedBigInteger('workflow_id');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'tipo_instrumento_id'], 'req_wf_unq');
        });

        // ── 10. Notificações ─────────────────────────────────────────────
        Schema::create('requerimentos_notificacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('proposicao_id')->nullable();
            $table->string('evento', 50);
            $table->string('titulo', 200);
            $table->text('mensagem');
            $table->string('canal', 20);
            $table->boolean('lida')->default(false);
            $table->timestamp('lida_em')->nullable();
            $table->timestamp('enviada_em')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'user_id', 'lida'], 'req_notif_user_idx');
            $table->index(['tenant_id', 'proposicao_id'], 'req_notif_prop_idx');
        });

        // ── 11. Preferências de Notificação ─────────────────────────────
        Schema::create('requerimentos_preferencias_notificacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->json('canais');
            $table->boolean('digest_diario')->default(false);
            $table->timestamps();
            $table->unique(['tenant_id', 'user_id'], 'req_pref_not_unq');
        });

        // ── 12. Etapas de Tramitação Interna ──────────────────────────
        Schema::create('requerimentos_etapas_tramitacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proposicao_id')->constrained('requerimentos_proposicoes')->cascadeOnDelete();
            $table->string('etapa_nome', 100);
            $table->integer('ordem')->default(0);
            $table->string('status', 30)->default('pendente');
            $table->unsignedBigInteger('responsavel_id')->nullable();
            $table->date('data_inicio')->nullable();
            $table->date('data_conclusao')->nullable();
            $table->integer('prazo_dias')->nullable();
            $table->text('observacao')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'proposicao_id'], 'req_etapa_prop_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requerimentos_etapas_tramitacao');
        Schema::dropIfExists('requerimentos_preferencias_notificacao');
        Schema::dropIfExists('requerimentos_notificacoes');
        Schema::dropIfExists('requerimentos_workflows');
        Schema::dropIfExists('requerimentos_respostas');
        Schema::dropIfExists('requerimentos_tramitacoes_poderes');
        Schema::dropIfExists('requerimentos_vinculacoes');
        Schema::dropIfExists('requerimentos_anexos');
        Schema::dropIfExists('requerimentos_autores');
        Schema::dropIfExists('requerimentos_proposicoes');
        Schema::dropIfExists('requerimentos_contadores');
        Schema::dropIfExists('requerimentos_tipos_instrumento');
    }
};