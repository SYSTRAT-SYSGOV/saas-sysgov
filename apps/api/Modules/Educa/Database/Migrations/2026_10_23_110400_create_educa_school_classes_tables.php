<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Turmas Escolares
        Schema::create('educa_school_classes', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained('educa_courses')->cascadeOnDelete();
            $table->foreignUuid('grade_id')->constrained('educa_grades')->cascadeOnDelete();
            $table->foreignUuid('matrix_id')->constrained('educa_curriculum_matrices')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('nome', 80);
            $table->string('sigla', 20)->nullable();
            $table->string('turno', 20); // matutino, vespertino, noturno, integral
            $table->string('sala', 50)->nullable();
            $table->unsignedSmallInteger('lotacao_maxima');
            $table->unsignedSmallInteger('lotacao_efetiva')->default(0);
            $table->string('tipo_atendimento', 20)->default('regular'); // regular, complementar, aee
            $table->boolean('is_multiseriada')->default(false);
            $table->string('status', 20)->default('ativa'); // ativa, inativa
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'school_id', 'academic_year_id', 'course_id', 'grade_id', 'nome'], 'educa_classes_unique_name');
            $table->index(['tenant_id', 'school_id', 'academic_year_id']);
            $table->index(['tenant_id', 'turno']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_school_classes');
    }
};
