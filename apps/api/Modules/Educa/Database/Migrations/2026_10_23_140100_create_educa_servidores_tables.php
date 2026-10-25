<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Servidor Escolar (Extensão Funcional de Pessoa)
        Schema::create('educa_employees', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->decimal('carga_horaria_semanal', 5, 2)->default(40.00);
            $table->string('escolaridade', 50)->nullable();
            $table->string('codigo_inep_docente', 20)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'pessoa_id']);
            $table->index(['tenant_id', 'ativo']);
        });

        // 2. Funções Profissionais e Matrículas Funcionais
        Schema::create('educa_employee_roles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->string('nome_funcao', 100);
            $table->string('matricula', 50);
            $table->boolean('is_docente')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'matricula']);
            $table->index(['tenant_id', 'employee_id']);
        });

        // 3. Lotações Escolares e Cumprimento da Lei do Piso
        Schema::create('educa_employee_allocations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->string('turno', 30);
            $table->unsignedTinyInteger('dia_semana')->nullable(); // 1=Domingo, 2=Segunda ... 7=Sábado
            $table->decimal('horas_regencia', 5, 2)->default(0.00);
            $table->decimal('horas_atividade', 5, 2)->default(0.00);
            $table->decimal('horas_excedentes', 5, 2)->default(0.00);
            $table->string('status', 30)->default('ativa'); // ativa, suspensa, cancelada
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'employee_id', 'academic_year_id'], 'idx_emp_alloc_year');
            $table->index(['tenant_id', 'school_id', 'status'], 'idx_emp_alloc_school');
        });

        // 4. Habilitações Curriculares Docentes
        Schema::create('educa_teacher_qualifications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->foreignUuid('curriculum_component_id')->constrained('educa_curriculum_components')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(
                ['tenant_id', 'employee_id', 'curriculum_component_id'],
                'uq_teacher_qual_comp'
            );
        });

        // 5. Afastamentos e Licenças Temporárias com Suspensão de Alocações
        Schema::create('educa_employee_withdrawals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->string('tipo_afastamento', 50); // licenca_medica, licenca_maternidade, etc.
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->string('motivo', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'employee_id', 'data_inicio'], 'idx_emp_withd_dates');
        });

        // 6. Faltas e Atrasos Funcionais
        Schema::create('educa_employee_absences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->date('data_falta');
            $table->string('tipo', 30)->default('falta'); // falta, atraso
            $table->unsignedSmallInteger('minutos')->default(50);
            $table->boolean('justificada')->default(false);
            $table->string('motivo_justificativa', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'employee_id', 'data_falta'], 'idx_emp_abs_date');
            $table->index(['tenant_id', 'school_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_employee_absences');
        Schema::dropIfExists('educa_employee_withdrawals');
        Schema::dropIfExists('educa_teacher_qualifications');
        Schema::dropIfExists('educa_employee_allocations');
        Schema::dropIfExists('educa_employee_roles');
        Schema::dropIfExists('educa_employees');
    }
};
