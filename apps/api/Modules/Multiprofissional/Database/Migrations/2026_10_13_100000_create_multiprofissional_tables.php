<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Módulo Multiprofissional (change criar-modulo-multiprofissional). Escola = escola_escolas, estudante =
 * escola_alunos e profissional = pessoa do Cadastro de Pessoas (design D2): nada de cadastro paralelo de pessoas.
 */
return new class extends Migration
{
    public function up(): void
    {
        // Cadastros simples do tenant: cargos, condições (CID) e tipos de atendimento.
        Schema::create('multi_cargos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('objetivos', 300)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome'], 'mp_cargos_t_nome_uq');
        });

        Schema::create('multi_condicoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->string('cid', 20)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome'], 'mp_condicoes_t_nome_uq');
            $table->index(['tenant_id', 'cid'], 'mp_condicoes_t_cid_ix');
        });

        Schema::create('multi_tipos_atendimento', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome'], 'mp_tipos_atendimento_t_nome_uq');
        });

        Schema::create('multi_profissionais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('cargo_id')->constrained('multi_cargos')->restrictOnDelete();
            $table->string('nome', 200);
            $table->string('cpf_mascarado', 20);
            $table->string('registro_profissional', 50)->nullable();
            $table->string('telefone', 30)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'pessoa_id'], 'mp_profissionais_t_pessoa_uq');
            $table->unique(['tenant_id', 'user_id'], 'mp_profissionais_t_user_uq');
            $table->index(['tenant_id', 'ativo'], 'mp_profissionais_t_ativo_ix');
        });

        Schema::create('multi_equipes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->string('turno', 20)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome'], 'mp_equipes_t_nome_uq');
        });

        Schema::create('multi_equipe_profissionais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('equipe_id')->constrained('multi_equipes')->cascadeOnDelete();
            $table->foreignId('profissional_id')->constrained('multi_profissionais')->cascadeOnDelete();
            $table->unique(['equipe_id', 'profissional_id'], 'mp_equipe_profissionais_equipe_profissional_uq');
            $table->index(['tenant_id', 'profissional_id'], 'mp_equipe_profissionais_t_profissional_ix');
        });

        Schema::create('multi_equipe_escolas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('equipe_id')->constrained('multi_equipes')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->cascadeOnDelete();
            $table->unique(['equipe_id', 'escola_id'], 'mp_equipe_escolas_equipe_escola_uq');
            $table->index(['tenant_id', 'escola_id'], 'mp_equipe_escolas_t_escola_ix');
        });

        // Estudante acompanhado (o "especial" do legado): um por aluno no tenant.
        Schema::create('multi_acompanhados', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->restrictOnDelete();
            $table->text('observacoes')->nullable();
            $table->boolean('ativo')->default(true);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'aluno_id'], 'mp_acompanhados_t_aluno_uq');
            $table->index(['tenant_id', 'ativo'], 'mp_acompanhados_t_ativo_ix');
        });

        Schema::create('multi_acompanhado_condicoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('acompanhado_id')->constrained('multi_acompanhados')->cascadeOnDelete();
            $table->foreignId('condicao_id')->constrained('multi_condicoes')->restrictOnDelete();
            $table->date('diagnosticado_em')->nullable();
            $table->unique(['acompanhado_id', 'condicao_id'], 'mp_acompanhado_condicoes_acompanhado_condicao_uq');
            $table->index(['tenant_id', 'condicao_id'], 'mp_acompanhado_condicoes_t_condicao_ix');
        });

        Schema::create('multi_acompanhado_profissionais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('acompanhado_id')->constrained('multi_acompanhados')->cascadeOnDelete();
            $table->foreignId('profissional_id')->constrained('multi_profissionais')->cascadeOnDelete();
            $table->string('papel', 100)->nullable();
            $table->unique(['acompanhado_id', 'profissional_id'], 'mp_acompanhado_profissionais_acompanhado_profissional_uq');
            $table->index(['tenant_id', 'profissional_id'], 'mp_acompanhado_profissionais_t_profissional_ix');
        });

        Schema::create('multi_laudos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('acompanhado_id')->constrained('multi_acompanhados')->cascadeOnDelete();
            $table->foreignId('condicao_id')->nullable()->constrained('multi_condicoes')->nullOnDelete();
            $table->string('descricao', 200);
            $table->string('emitente', 200)->nullable();
            $table->date('emitido_em')->nullable();
            $table->string('arquivo_path');
            $table->string('arquivo_mime', 100);
            $table->string('arquivo_nome', 200);
            $table->unsignedInteger('arquivo_tamanho');
            $table->foreignId('enviado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['tenant_id', 'acompanhado_id'], 'mp_laudos_t_acompanhado_ix');
        });

        Schema::create('multi_atendimentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->dateTime('data_hora');
            $table->string('turno', 20);
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('equipe_id')->nullable()->constrained('multi_equipes')->nullOnDelete();
            $table->text('relato')->nullable();
            $table->boolean('sigiloso')->default(false);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['tenant_id', 'data_hora'], 'mp_atendimentos_t_data_hora_ix');
            $table->index(['tenant_id', 'escola_id', 'data_hora'], 'mp_atendimentos_t_escola_data_hora_ix');
        });

        Schema::create('multi_atendimento_alunos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('atendimento_id')->constrained('multi_atendimentos')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->restrictOnDelete();
            $table->unique(['atendimento_id', 'aluno_id'], 'mp_atendimento_alunos_atendimento_aluno_uq');
            $table->index(['tenant_id', 'aluno_id'], 'mp_atendimento_alunos_t_aluno_ix');
        });

        Schema::create('multi_atendimento_profissionais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('atendimento_id')->constrained('multi_atendimentos')->cascadeOnDelete();
            $table->foreignId('profissional_id')->constrained('multi_profissionais')->restrictOnDelete();
            $table->unique(['atendimento_id', 'profissional_id'], 'mp_atendimento_profissionais_atendimento_profissional_uq');
            $table->index(['tenant_id', 'profissional_id'], 'mp_atendimento_profissionais_t_profissional_ix');
        });

        Schema::create('multi_atendimento_tipos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('atendimento_id')->constrained('multi_atendimentos')->cascadeOnDelete();
            $table->foreignId('tipo_id')->constrained('multi_tipos_atendimento')->restrictOnDelete();
            $table->unique(['atendimento_id', 'tipo_id'], 'mp_atendimento_tipos_atendimento_tipo_uq');
            $table->index(['tenant_id', 'tipo_id'], 'mp_atendimento_tipos_t_tipo_ix');
        });
    }

    public function down(): void
    {
        foreach ([
            'multi_atendimento_tipos', 'multi_atendimento_profissionais', 'multi_atendimento_alunos', 'multi_atendimentos',
            'multi_laudos', 'multi_acompanhado_profissionais', 'multi_acompanhado_condicoes', 'multi_acompanhados',
            'multi_equipe_escolas', 'multi_equipe_profissionais', 'multi_equipes', 'multi_profissionais',
            'multi_tipos_atendimento', 'multi_condicoes', 'multi_cargos',
        ] as $tabela) {
            Schema::dropIfExists($tabela);
        }
    }
};
