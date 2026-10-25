<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cronograma de Reuniões de Conselho de Classe e Pré-Conselho
        Schema::create('educa_conselho_cronogramas', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->string('periodo', 50); // 1_bimestre, 2_bimestre, 3_bimestre, 4_bimestre, 1_semestre, 2_semestre, final
            $table->date('data_inicio_pre_conselho');
            $table->date('data_fim_pre_conselho');
            $table->date('data_reuniao_conselho');
            $table->string('status', 30)->default('agendado'); // agendado, em_andamento, concluido, cancelado
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'ano_letivo', 'periodo'], 'idx_cronograma_busca');
            $table->index(['tenant_id', 'status']);
        });

        // 2. Ficha Diagnóstica de Pré-Conselho (por turma e componente curricular)
        Schema::create('educa_conselho_pre_conselhos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('cronograma_id')->constrained('educa_conselho_cronogramas')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->constrained('educa_school_classes')->cascadeOnDelete();
            $table->foreignUuid('curriculum_component_id')->constrained('educa_curriculum_components')->cascadeOnDelete();
            $table->foreignId('professor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('periodo', 50);
            $table->string('desempenho_geral_turma', 30); // excelente, bom, regular, insatisfatorio
            $table->unsignedTinyInteger('objetivos_atingidos_percentual')->default(0);
            $table->json('metodologias_utilizadas')->nullable();
            $table->text('dificuldades_detectadas')->nullable();
            $table->text('acoes_intervencao_sugeridas')->nullable();
            $table->string('status', 30)->default('ativo');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'cronograma_id', 'school_class_id', 'curriculum_component_id'], 'uq_pre_conselho_turma_disciplina');
            $table->index(['tenant_id', 'school_class_id', 'periodo']);
        });

        // 3. Alunos Sinalizados na Ficha de Pré-Conselho
        Schema::create('educa_conselho_pre_conselho_alunos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('pre_conselho_id')->constrained('educa_conselho_pre_conselhos')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->string('nivel_atencao', 30); // baixo, medio, alto, critico
            $table->string('motivo_atencao', 50); // rendimento_baixo, faltas_excessivas, comportamento, socioemocional, outro
            $table->text('detalhes')->nullable();
            $table->text('encaminhamentos')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'pre_conselho_id']);
            $table->index(['tenant_id', 'enrollment_id']);
        });

        // 4. Ata Deliberativa de Conselho de Classe
        Schema::create('educa_conselho_atas', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->constrained('educa_school_classes')->cascadeOnDelete();
            $table->foreignUuid('cronograma_id')->constrained('educa_conselho_cronogramas')->cascadeOnDelete();
            $table->string('numero_ata', 50);
            $table->string('periodo', 50);
            $table->date('data_reuniao');
            $table->string('horario_inicio', 10)->nullable();
            $table->string('horario_fim', 10)->nullable();
            $table->text('resumo_geral')->nullable();
            $table->text('deliberacoes_coletivas')->nullable();
            $table->string('status', 30)->default('rascunho'); // rascunho, em_revisao, finalizada, homologada
            $table->foreignId('finalizado_por_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('finalizado_em')->nullable();
            $table->foreignId('homologado_por_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('homologado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'school_class_id', 'cronograma_id'], 'uq_ata_turma_cronograma');
            $table->index(['tenant_id', 'school_id', 'status']);
        });

        // 5. Deliberações Individuais dos Estudantes na Ata
        Schema::create('educa_conselho_deliberacoes_alunos', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('ata_id')->constrained('educa_conselho_atas')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->string('resultado_deliberacao', 50); // progressao_plena, progressao_dependencia, recuperacao_intensiva, retencao
            $table->text('parecer_descritivo')->nullable();
            $table->json('disciplinas_dependencia')->nullable();
            $table->text('encaminhamento_pedagogico')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'ata_id', 'enrollment_id'], 'uq_deliberacao_ata_aluno');
            $table->index(['tenant_id', 'enrollment_id']);
        });

        // 6. Membros Presentes e Assinaturas da Ata
        Schema::create('educa_conselho_membros', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('ata_id')->constrained('educa_conselho_atas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('cargo_funcao', 100);
            $table->boolean('presente')->default(true);
            $table->timestamp('assinou_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'ata_id', 'user_id'], 'uq_ata_membro');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_conselho_membros');
        Schema::dropIfExists('educa_conselho_deliberacoes_alunos');
        Schema::dropIfExists('educa_conselho_atas');
        Schema::dropIfExists('educa_conselho_pre_conselho_alunos');
        Schema::dropIfExists('educa_conselho_pre_conselhos');
        Schema::dropIfExists('educa_conselho_cronogramas');
    }
};
