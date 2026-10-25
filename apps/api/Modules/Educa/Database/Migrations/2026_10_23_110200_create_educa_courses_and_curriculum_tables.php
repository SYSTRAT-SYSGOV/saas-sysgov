<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cursos da Rede Municipal
        Schema::create('educa_courses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('nome', 100);
            $table->string('nivel', 30); // infantil, fundamental_iniciais, fundamental_finais, medio, eja
            $table->string('modalidade', 30); // regular, especial, eja
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'codigo']);
            $table->index(['tenant_id', 'nivel']);
        });

        // 2. Séries / Anos Escolares
        Schema::create('educa_grades', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained('educa_courses')->cascadeOnDelete();
            $table->unsignedTinyInteger('sequencial');
            $table->string('codigo', 20);
            $table->string('nome', 50);
            $table->unsignedSmallInteger('carga_horaria_minima_anual')->default(800);
            $table->unsignedSmallInteger('dias_letivos_minimos')->default(200);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'course_id', 'sequencial']);
            $table->index(['tenant_id', 'course_id']);
        });

        // 3. Áreas de Conhecimento da BNCC
        Schema::create('educa_knowledge_areas', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('nome', 60);
            $table->string('secao', 50)->nullable();
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'codigo']);
        });

        // 4. Componentes Curriculares (Disciplinas)
        Schema::create('educa_curriculum_components', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('knowledge_area_id')->constrained('educa_knowledge_areas')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('codigo_educacenso_inep', 10)->nullable();
            $table->string('nome', 100);
            $table->string('sigla', 10);
            $table->string('base_curricular', 30); // nacional_comum, diversificada, profissional, ensino_religioso
            $table->boolean('desconsiderar_progressao')->default(false);
            $table->string('color_hex', 7)->default('#2563EB');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'codigo']);
            $table->index(['tenant_id', 'knowledge_area_id']);
        });

        // 5. Matrizes Curriculares da Rede
        Schema::create('educa_curriculum_matrices', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained('educa_courses')->cascadeOnDelete();
            $table->foreignUuid('grade_id')->constrained('educa_grades')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->unsignedSmallInteger('ano_vigencia');
            $table->unsignedSmallInteger('total_horas_anuais')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['tenant_id', 'course_id', 'grade_id', 'ano_vigencia'],
                'educa_matrix_scope_unique',
            );
            $table->index(['tenant_id', 'ativo']);
        });

        // 6. Itens / Componentes da Matriz Curricular
        Schema::create('educa_matrix_components', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('matrix_id')->constrained('educa_curriculum_matrices')->cascadeOnDelete();
            $table->foreignUuid('component_id')->constrained('educa_curriculum_components')->cascadeOnDelete();
            $table->unsignedTinyInteger('horas_semanais');
            $table->unsignedSmallInteger('horas_anuais');
            $table->string('tipo_nota', 20)->default('numerica'); // numerica, conceitual, parecer
            $table->timestamps();

            $table->unique(['tenant_id', 'matrix_id', 'component_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_matrix_components');
        Schema::dropIfExists('educa_curriculum_matrices');
        Schema::dropIfExists('educa_curriculum_components');
        Schema::dropIfExists('educa_knowledge_areas');
        Schema::dropIfExists('educa_grades');
        Schema::dropIfExists('educa_courses');
    }
};
