<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cabeçalho do Quadro de Horários por Turma
        Schema::create('educa_timetables', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->constrained('educa_school_classes')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('turno', 20); // matutino, vespertino, noturno, integral
            $table->boolean('ativo')->default(true);
            $table->date('data_inicio_vigencia');
            $table->date('data_fim_vigencia')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_class_id', 'ativo']);
            $table->index(['tenant_id', 'academic_year_id']);
        });

        // 2. Definição dos Tempos de Aula e Intervalos (Slots)
        Schema::create('educa_timetable_slots', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('timetable_id')->constrained('educa_timetables')->cascadeOnDelete();
            $table->unsignedSmallInteger('numero_tempo');
            $table->time('hora_inicio');
            $table->time('hora_fim');
            $table->string('tipo', 30)->default('aula'); // aula, intervalo, almoco, estudo_dirigido
            $table->string('descricao', 80)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'timetable_id', 'numero_tempo'], 'educa_slots_unique_tempo');
            $table->index(['tenant_id', 'hora_inicio', 'hora_fim']);
        });

        // 3. Aulas Alocadas Semanalmente por Slot
        Schema::create('educa_timetable_lessons', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('timetable_slot_id')->constrained('educa_timetable_slots')->cascadeOnDelete();
            $table->unsignedTinyInteger('dia_semana'); // 1=Dom, 2=Seg, 3=Ter, 4=Qua, 5=Qui, 6=Sex, 7=Sab
            $table->foreignUuid('curriculum_component_id')->constrained('educa_curriculum_components')->cascadeOnDelete();
            $table->foreignUuid('teacher_employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->foreignUuid('substitute_employee_id')->nullable()->constrained('educa_employees')->nullOnDelete();
            $table->date('substituicao_inicio')->nullable();
            $table->date('substituicao_fim')->nullable();
            $table->string('substituicao_motivo', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'timetable_slot_id', 'dia_semana'], 'educa_lessons_unique_slot_dia');
            $table->index(['tenant_id', 'teacher_employee_id', 'dia_semana'], 'educa_lessons_teacher_dia_idx');
            $table->index(['tenant_id', 'substitute_employee_id', 'dia_semana'], 'educa_lessons_substitute_dia_idx');
        });

        // 4. Extensão no Diário de Classe para vinculação com o Quadro de Horários
        if (Schema::hasTable('educa_class_diaries') && !Schema::hasColumn('educa_class_diaries', 'timetable_lesson_id')) {
            Schema::table('educa_class_diaries', function (Blueprint $table): void {
                $table->foreignUuid('timetable_lesson_id')->nullable()->after('curriculum_component_id')->constrained('educa_timetable_lessons')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('educa_class_diaries', 'timetable_lesson_id')) {
            Schema::table('educa_class_diaries', function (Blueprint $table): void {
                $table->dropForeign(['timetable_lesson_id']);
                $table->dropColumn('timetable_lesson_id');
            });
        }

        Schema::dropIfExists('educa_timetable_lessons');
        Schema::dropIfExists('educa_timetable_slots');
        Schema::dropIfExists('educa_timetables');
    }
};
