<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabelas do módulo Pedagógico, todas sobre o cadastro do módulo Escola (alunos, turmas, matérias, categorias).
 * Notas e frequências não têm soft delete: são substituídas (upsert) e a unicidade fica no banco (design D4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pedagogico_notas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('escola_materias')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('trimestre');
            $table->decimal('nota', 3, 1);
            $table->decimal('nota_recuperacao', 3, 1)->nullable();
            $table->foreignId('lancado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'aluno_id', 'materia_id', 'ano_letivo', 'trimestre'], 'pedagogico_notas_unica');
            $table->index(['tenant_id', 'materia_id', 'ano_letivo', 'trimestre'], 'pedagogico_notas_materia_periodo_idx');
        });

        Schema::create('pedagogico_ocorrencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->foreignId('categoria_id')->constrained('escola_categorias_ocorrencia')->restrictOnDelete();
            $table->date('data');
            $table->text('descricao');
            $table->string('severidade', 20);
            $table->string('anexo_path')->nullable();
            $table->string('anexo_nome')->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'aluno_id', 'data']);
            $table->index(['tenant_id', 'data']);
            $table->index(['tenant_id', 'categoria_id']);
        });

        Schema::create('pedagogico_pre_conselhos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->foreignId('materia_id')->constrained('escola_materias')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('periodo');
            $table->date('data_registro');
            $table->string('desempenho_geral', 20);
            $table->text('desempenho_justificativa')->nullable();
            $table->text('conteudos_trabalhados')->nullable();
            $table->string('objetivos_atingidos', 20)->nullable();
            $table->json('metodologias')->nullable();
            $table->text('metodologias_outras')->nullable();
            $table->text('metodologias_eficacia')->nullable();
            $table->json('instrumentos_avaliativos')->nullable();
            $table->string('instrumentos_adequados', 20)->nullable();
            $table->text('instrumentos_outros')->nullable();
            $table->text('instrumentos_obs')->nullable();
            $table->string('engajamento_nivel', 20)->nullable();
            $table->text('engajamento_dificuldades')->nullable();
            $table->text('engajamento_potencialidades')->nullable();
            $table->text('dificuldades_aprendizagem')->nullable();
            $table->text('estrategias_superacao')->nullable();
            $table->string('socioemocional_status', 30)->nullable();
            $table->text('socioemocional_descricao')->nullable();
            $table->text('obs_pedagogicas')->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'turma_id', 'ano_letivo', 'periodo'], 'pedagogico_pc_turma_periodo_idx');
            $table->index(['tenant_id', 'materia_id']);
        });

        Schema::create('pedagogico_pre_conselho_alunos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pre_conselho_id')->constrained('pedagogico_pre_conselhos')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->string('nivel_atencao', 10);
            $table->text('dificuldade')->nullable();
            $table->text('encaminhamentos')->nullable();
            $table->boolean('destaque')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'pre_conselho_id', 'aluno_id'], 'pedagogico_pca_unico');
            $table->index(['tenant_id', 'aluno_id']);
        });

        Schema::create('pedagogico_cronogramas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('periodo');
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ano_letivo', 'data_inicio']);
        });

        Schema::create('pedagogico_atas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('periodo');
            $table->date('data_reuniao');
            $table->string('direcao', 200)->nullable();
            $table->string('pedagogia', 300)->nullable();
            $table->string('secretaria', 200)->nullable();
            $table->text('deliberacoes')->nullable();
            $table->unsignedSmallInteger('aprovados')->default(0);
            $table->unsignedSmallInteger('recuperacao')->default(0);
            $table->unsignedSmallInteger('retidos')->default(0);
            $table->string('status', 20)->default('rascunho');
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'turma_id', 'ano_letivo', 'periodo']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('pedagogico_frequencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turma_id')->constrained('escola_turmas')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->date('data');
            $table->string('presenca', 20);
            $table->string('observacao', 255)->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'aluno_id', 'data'], 'pedagogico_frequencias_unica');
            $table->index(['tenant_id', 'turma_id', 'data']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pedagogico_frequencias');
        Schema::dropIfExists('pedagogico_atas');
        Schema::dropIfExists('pedagogico_cronogramas');
        Schema::dropIfExists('pedagogico_pre_conselho_alunos');
        Schema::dropIfExists('pedagogico_pre_conselhos');
        Schema::dropIfExists('pedagogico_ocorrencias');
        Schema::dropIfExists('pedagogico_notas');
    }
};
