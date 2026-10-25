<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Escolas (Extensão Educacional da OrgUnit do OrgChart)
        Schema::create('educa_schools', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->string('codigo_inep', 8)->nullable();
            $table->string('sigla', 20);
            $table->string('situacao_funcionamento', 20)->default('em_atividade'); // em_atividade, paralisada, extinta
            $table->string('dependencia_administrativa', 20)->default('municipal'); // municipal, estadual, federal, privada
            $table->string('zona', 10)->default('urbana'); // urbana, rural
            $table->boolean('regulamentada')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'org_unit_id']);
            $table->unique(['tenant_id', 'codigo_inep']);
            $table->index(['tenant_id', 'situacao_funcionamento']);
        });

        // 2. Oferta de Cursos por Escola
        Schema::create('educa_school_courses', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained('educa_courses')->cascadeOnDelete();
            $table->string('autorizacao_ato', 100)->nullable();
            $table->date('data_autorizacao')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'school_id', 'course_id']);
        });

        // 3. Oferta de Séries por Escola (com travas de vagas)
        Schema::create('educa_school_grades', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('grade_id')->constrained('educa_grades')->cascadeOnDelete();
            $table->boolean('bloquear_enturmacao_sem_vaga')->default(true);
            $table->boolean('bloquear_abertura_turma_com_vagas')->default(false);
            $table->timestamps();

            $table->unique(['tenant_id', 'school_id', 'grade_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_school_grades');
        Schema::dropIfExists('educa_school_courses');
        Schema::dropIfExists('educa_schools');
    }
};
