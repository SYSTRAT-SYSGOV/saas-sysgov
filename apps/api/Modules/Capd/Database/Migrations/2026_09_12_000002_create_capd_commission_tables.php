<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 8. Comissões (CAPD) ───────────────────────────────────────
        Schema::create('capd_comissoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ciclo_id')->constrained('capd_ciclos')->cascadeOnDelete();
            $table->string('numero_portaria', 50);
            $table->date('data_publicacao_portaria');
            $table->boolean('ativa')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ciclo_id', 'ativa']);
            $table->unique(['tenant_id', 'ciclo_id']); // Uma comissão por ciclo
        });

        // ── 9. Membros da Comissão ────────────────────────────────────
        // papel: presidente|secretario|titular_gestao|titular_servidor|suplente
        Schema::create('capd_comissao_membros', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('comissao_id')->constrained('capd_comissoes')->cascadeOnDelete();
            $table->foreignId('servidor_id')->constrained('users');
            $table->string('papel', 25);
            $table->boolean('ativo')->default(true);
            $table->date('data_inicio_mandato')->nullable();
            $table->date('data_fim_mandato')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'comissao_id', 'ativo']);
            $table->unique(['tenant_id', 'comissao_id', 'servidor_id']);
        });

        // ── 10. Impedimentos de Membros ───────────────────────────────
        Schema::create('capd_impedimentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('comissao_membro_id')->constrained('capd_comissao_membros')->cascadeOnDelete();
            // Servidor alvo do processo em que há impedimento
            $table->foreignId('servidor_alvo_id')->constrained('users');
            // grau_parentesco | subordinacao_direta | recorrente | avaliador | autodeclarado
            $table->string('tipo_impedimento', 30);
            $table->string('motivo', 255);
            $table->timestamp('declarado_em')->useCurrent();
            $table->foreignId('declarado_por')->constrained('users');
            $table->timestamps();

            $table->index(['tenant_id', 'comissao_membro_id']);
            $table->index(['tenant_id', 'servidor_alvo_id']);
        });

        // ── 11. Recursos Administrativos ──────────────────────────────
        // status: interposto|em_instrucao|pautado|julgado_provido|julgado_desprovido|cancelado
        Schema::create('capd_recursos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('avaliacao_id')->constrained('capd_avaliacoes')->cascadeOnDelete();
            $table->foreignId('recorrente_id')->constrained('users');
            $table->foreignId('fator_contestado_id')->constrained('capd_fatores_avaliacao');
            $table->text('justificativa_servidor');
            $table->string('status', 30)->default('interposto');
            $table->foreignId('relator_id')->nullable()->constrained('capd_comissao_membros');
            $table->timestamp('prazo_relator_ate')->nullable();   // RN-C05: 5 dias úteis
            $table->text('contestacao_chefia')->nullable();
            $table->timestamp('contestacao_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'avaliacao_id']);
            $table->index(['tenant_id', 'relator_id']);
        });

        // ── 12. Documentos do Recurso (contraprovas do servidor) ──────
        Schema::create('capd_recurso_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('recurso_id')->constrained('capd_recursos')->cascadeOnDelete();
            $table->foreignId('enviado_por')->constrained('users');
            $table->string('nome_arquivo', 255);
            $table->string('url_armazenamento', 500);
            $table->string('hash_sha256', 64);
            $table->string('mime_type', 50);
            $table->unsignedBigInteger('tamanho_bytes')->default(0);
            $table->timestamps();

            $table->index(['tenant_id', 'recurso_id']);
        });

        // ── 13. Sessões Deliberativas ─────────────────────────────────
        Schema::create('capd_sessoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('comissao_id')->constrained('capd_comissoes')->cascadeOnDelete();
            // ordinaria | extraordinaria
            $table->string('tipo_sessao', 20)->default('ordinaria');
            $table->timestamp('data_sessao');
            $table->unsignedSmallInteger('quorum_presente')->default(0);
            $table->unsignedSmallInteger('quorum_minimo')->default(4); // 50%+1
            $table->text('ata_texto')->nullable();
            $table->string('hash_ata_sha256', 64)->nullable();
            $table->boolean('finalizada')->default(false);
            $table->timestamp('finalizada_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'comissao_id', 'finalizada']);
            $table->index(['tenant_id', 'data_sessao']);
        });

        // ── 14. Itens de Pauta da Sessão ──────────────────────────────
        Schema::create('capd_sessao_pautas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sessao_id')->constrained('capd_sessoes')->cascadeOnDelete();
            $table->foreignId('recurso_id')->nullable()->constrained('capd_recursos');
            // Para auditorias sem recurso (amostral/notas extremas)
            $table->foreignId('avaliacao_id')->nullable()->constrained('capd_avaliacoes');
            $table->integer('ordem')->default(0);
            // pendente | deliberado | adiado
            $table->string('status_pauta', 20)->default('pendente');
            $table->timestamps();

            $table->index(['tenant_id', 'sessao_id', 'status_pauta']);
        });

        // ── 15. Deliberações e Votos ──────────────────────────────────
        Schema::create('capd_deliberacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sessao_id')->constrained('capd_sessoes')->cascadeOnDelete();
            $table->foreignId('recurso_id')->constrained('capd_recursos')->cascadeOnDelete();
            $table->foreignId('membro_id')->constrained('capd_comissao_membros');
            $table->boolean('voto_favoravel');
            // Grau proposto pelo relator ao julgar (opcional)
            $table->unsignedTinyInteger('novo_grau_proposto')->nullable();
            $table->text('parecer_voto')->nullable();
            $table->timestamp('voto_registrado_em')->useCurrent();
            $table->timestamps();

            $table->index(['tenant_id', 'sessao_id', 'recurso_id']);
            $table->index(['tenant_id', 'membro_id']);
            // Cada membro vota uma vez por recurso por sessão
            $table->unique(['tenant_id', 'sessao_id', 'recurso_id', 'membro_id'], 'capd_delib_voto_unq');
        });

        // ── 16. Notificações Disparadas ───────────────────────────────
        Schema::create('capd_notificacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('destinatario_id')->constrained('users');
            // email | in_app | (whatsapp: roadmap futuro)
            $table->string('canal', 20);
            $table->string('tipo', 60);          // prazo_recurso | lembrete_cit | homologacao | etc.
            $table->string('titulo', 200);
            $table->text('corpo');
            $table->json('contexto')->nullable(); // {ciclo_id, avaliacao_id, recurso_id}
            $table->boolean('lida')->default(false);
            $table->timestamp('lida_em')->nullable();
            $table->boolean('enviada')->default(false);
            $table->timestamp('enviada_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'destinatario_id', 'lida']);
            $table->index(['tenant_id', 'enviada', 'canal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_notificacoes');
        Schema::dropIfExists('capd_deliberacoes');
        Schema::dropIfExists('capd_sessao_pautas');
        Schema::dropIfExists('capd_sessoes');
        Schema::dropIfExists('capd_recurso_documentos');
        Schema::dropIfExists('capd_recursos');
        Schema::dropIfExists('capd_impedimentos');
        Schema::dropIfExists('capd_comissao_membros');
        Schema::dropIfExists('capd_comissoes');
    }
};
