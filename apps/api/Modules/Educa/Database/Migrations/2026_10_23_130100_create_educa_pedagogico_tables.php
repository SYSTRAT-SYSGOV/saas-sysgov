<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Diário de Classe (Aulas Dadas e Conteúdos Curriculares)
        Schema::create('educa_class_diaries', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->constrained('educa_school_classes')->cascadeOnDelete();
            $table->foreignUuid('curriculum_component_id')->constrained('educa_curriculum_components')->cascadeOnDelete();
            $table->date('data_aula');
            $table->unsignedTinyInteger('quantidade_aulas')->default(1);
            $table->text('conteudo');
            $table->string('habilidades_bncc', 500)->nullable();
            $table->string('status', 30)->default('publicado'); // rascunho, publicado
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_class_id', 'data_aula']);
            $table->index(['tenant_id', 'curriculum_component_id']);
        });

        // 2. Registros de Assiduidade e Frequência por Estudante Enturmado
        Schema::create('educa_attendance_records', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('class_diary_id')->constrained('educa_class_diaries')->cascadeOnDelete();
            $table->foreignUuid('class_enrollment_id')->constrained('educa_class_enrollments')->cascadeOnDelete();
            $table->string('status', 30)->default('presente'); // presente, falta, falta_justificada
            $table->string('justificativa', 255)->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'class_diary_id', 'class_enrollment_id'], 'uq_att_diary_enrollment');
            $table->index(
                ['tenant_id', 'class_enrollment_id', 'status'],
                'educa_attendance_enrollment_status_idx',
            );
        });

        // 3. Regras de Avaliação e Fórmulas de Cálculo Declarativo (sem eval)
        Schema::create('educa_evaluation_rules', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('tipo_nota', 30)->default('numerica'); // numerica, conceitual, parecer
            $table->decimal('nota_maxima', 5, 2)->default(10.00);
            $table->decimal('nota_minima_aprovacao', 5, 2)->default(6.00);
            $table->string('formula_media_anual', 255); // ex: "(E1 + E2 + E3 + E4) / 4"
            $table->string('formula_recuperacao', 255)->nullable(); // ex: "max(E, REC)"
            $table->string('formula_exame_final', 255)->nullable();
            $table->decimal('nota_minima_exame', 5, 2)->default(5.00);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'nome']);
            $table->index(['tenant_id', 'ativo']);
        });

        // 4. Tabelas de Arredondamento e Escalas Decimais Oficiais
        Schema::create('educa_grade_scales', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('evaluation_rule_id')->constrained('educa_evaluation_rules')->cascadeOnDelete();
            $table->decimal('limite_inferior', 5, 2);
            $table->decimal('limite_superior', 5, 2);
            $table->decimal('nota_arredondada', 5, 2);
            $table->string('conceito_alfabetico', 10)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'evaluation_rule_id']);
        });

        // 5. Lançamentos de Notas de Avaliação do Estudante por Etapa
        Schema::create('educa_student_grades', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->foreignUuid('curriculum_component_id')->constrained('educa_curriculum_components')->cascadeOnDelete();
            $table->foreignUuid('evaluation_rule_id')->constrained('educa_evaluation_rules')->cascadeOnDelete();
            $table->unsignedTinyInteger('etapa_sequencial'); // 1=1º Bim, 2=2º Bim...
            $table->decimal('nota_bruta', 5, 2)->nullable();
            $table->decimal('nota_recuperacao', 5, 2)->nullable();
            $table->decimal('nota_arredondada', 5, 2)->nullable();
            $table->string('conceito', 10)->nullable();
            $table->text('parecer_descritivo')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['tenant_id', 'enrollment_id', 'curriculum_component_id', 'etapa_sequencial'],
                'uq_grade_enrollment_comp_stage'
            );
            $table->index(['tenant_id', 'enrollment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_student_grades');
        Schema::dropIfExists('educa_grade_scales');
        Schema::dropIfExists('educa_evaluation_rules');
        Schema::dropIfExists('educa_attendance_records');
        Schema::dropIfExists('educa_class_diaries');
    }
};
