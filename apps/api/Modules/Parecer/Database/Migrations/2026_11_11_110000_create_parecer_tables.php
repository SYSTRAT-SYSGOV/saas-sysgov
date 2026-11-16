<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Parecer Descritivo (1º ao 5º ano), sobre o cadastro Escola (turmas, alunos, trimestres, categorias).
 * Tabelas próprias: série e funções da turma, habilidades, avaliações, observações, notas, frequência e
 * ocorrências. Todas com tenant_id; as de escola, com escola_id (multiescola).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parecer_turmas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->unsignedTinyInteger('serie');
            $table->timestamps();
            $table->unique(['tenant_id', 'turma_id'], 'parecer_turmas_tenant_turma_uq');
            $table->index(['tenant_id', 'escola_id', 'serie'], 'parecer_turmas_tenant_escola_serie_ix');
        });

        Schema::create('parecer_turma_funcoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->string('funcao', 40);
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'turma_id', 'funcao'], 'parecer_funcoes_tenant_turma_funcao_uq');
            $table->index(['tenant_id', 'user_id'], 'parecer_funcoes_tenant_user_ix');
        });

        // Habilidades: currículo da rede (por tenant), compartilhado pelas escolas.
        Schema::create('parecer_habilidades', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedTinyInteger('serie');
            $table->string('materia', 4);
            $table->unsignedInteger('ordem')->default(0);
            $table->text('descricao');
            $table->string('codigo_bncc', 20)->nullable();
            $table->string('trimestres', 3)->default('123');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'serie', 'materia', 'ordem'], 'parecer_hab_tenant_serie_materia_ix');
        });

        Schema::create('parecer_avaliacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->foreignId('habilidade_id')->constrained('parecer_habilidades')->cascadeOnDelete();
            $table->unsignedTinyInteger('trimestre');
            $table->string('conceito', 2);
            $table->foreignId('avaliado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'aluno_id', 'habilidade_id', 'trimestre'], 'parecer_aval_unica');
            $table->index(['tenant_id', 'escola_id'], 'parecer_aval_tenant_escola_ix');
        });

        Schema::create('parecer_observacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->unsignedTinyInteger('trimestre');
            $table->string('materia', 4)->default('');
            $table->text('texto');
            $table->foreignId('atualizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'aluno_id', 'trimestre', 'materia'], 'parecer_obs_unica');
        });

        Schema::create('parecer_notas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->string('materia', 4);
            $table->unsignedTinyInteger('trimestre');
            $table->decimal('nota', 4, 2);
            $table->foreignId('lancado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'aluno_id', 'materia', 'trimestre'], 'parecer_notas_unica');
        });

        Schema::create('parecer_frequencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->date('data');
            $table->char('status', 1)->default('C');
            $table->unsignedTinyInteger('aulas')->default(5);
            $table->unsignedTinyInteger('faltas')->default(0);
            $table->foreignId('lancado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'aluno_id', 'data'], 'parecer_freq_unica');
            $table->index(['tenant_id', 'turma_id', 'data'], 'parecer_freq_tenant_turma_data_ix');
        });

        Schema::create('parecer_ocorrencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->date('data');
            $table->foreignId('categoria_id')->nullable()->constrained('escola_categorias_ocorrencia')->nullOnDelete();
            $table->text('descricao');
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->string('registrado_nome', 150)->nullable();
            $table->string('anexo_path')->nullable();
            $table->string('anexo_nome')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'aluno_id', 'data'], 'parecer_ocor_tenant_aluno_data_ix');
            $table->index(['tenant_id', 'escola_id'], 'parecer_ocor_tenant_escola_ix');
        });
    }

    public function down(): void
    {
        foreach (['parecer_ocorrencias', 'parecer_frequencias', 'parecer_notas', 'parecer_observacoes', 'parecer_avaliacoes', 'parecer_habilidades', 'parecer_turma_funcoes', 'parecer_turmas'] as $tabela) {
            Schema::dropIfExists($tabela);
        }
    }
};
