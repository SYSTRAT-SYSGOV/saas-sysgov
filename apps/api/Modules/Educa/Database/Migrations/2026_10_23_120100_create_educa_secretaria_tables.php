<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Sequenciador Atômico de Matrículas (YYYY-NNNNNN por tenant)
        Schema::create('educa_enrollment_sequences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->unsignedInteger('current_number')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'ano']);
        });

        // 2. Ficha Cadastral e Complementar do Aluno (Extensão de Pessoas)
        Schema::create('educa_student_profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('codigo_nis', 20)->nullable();
            $table->string('cartao_sus', 20)->nullable();
            $table->boolean('bolsa_familia')->default(false);
            $table->boolean('necessidades_especiais')->default(false);
            $table->string('laudo_medico_aee', 255)->nullable();
            $table->boolean('transporte_escolar_publico')->default(false);
            $table->string('certidao_nascimento_termo', 30)->nullable();
            $table->string('certidao_nascimento_livro', 20)->nullable();
            $table->string('certidao_nascimento_folha', 20)->nullable();
            $table->string('certidao_cartorio', 100)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'pessoa_id']);
        });

        // 3. Vínculo de Responsáveis Legais
        Schema::create('educa_student_guardians', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignId('responsavel_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('tipo_parentesco', 30); // mae, pai, responsavel_legal, avo, outro
            $table->boolean('is_responsavel_financeiro')->default(false);
            $table->boolean('is_responsavel_pedagogico')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'aluno_pessoa_id', 'responsavel_pessoa_id'], 'educa_guardians_unique');
        });

        // 4. Matrícula Escolar
        Schema::create('educa_enrollments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('aluno_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('course_id')->constrained('educa_courses')->cascadeOnDelete();
            $table->foreignUuid('grade_id')->constrained('educa_grades')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->string('codigo_matricula', 20);
            $table->date('data_matricula');
            $table->string('tipo_matricula', 30)->default('inicial'); // inicial, renovacao, transferencia_entrada
            $table->string('status', 30)->default('ativa'); // ativa, remanejada, transferida, cancelada, concluida, abandonada, falecida
            $table->date('data_cancelamento')->nullable();
            $table->text('justificativa_cancelamento')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'codigo_matricula']);
            $table->index(
                ['tenant_id', 'aluno_pessoa_id', 'academic_year_id'],
                'educa_enrollments_student_year_idx',
            );
            $table->index(['tenant_id', 'school_id', 'academic_year_id']);
        });

        // 5. Enturmação do Estudante na Turma Física
        Schema::create('educa_class_enrollments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->foreignUuid('school_class_id')->constrained('educa_school_classes')->cascadeOnDelete();
            $table->unsignedSmallInteger('numero_ordem')->nullable();
            $table->date('data_entrada');
            $table->date('data_saida')->nullable();
            $table->string('status', 20)->default('ativa'); // ativa, encerrada, remanejada
            $table->timestamps();

            $table->index(['tenant_id', 'school_class_id', 'status']);
        });

        // 6. Transferências e Remanejamentos
        Schema::create('educa_transfers', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->string('tipo', 30); // interna_remanejamento, saida_rede, entrada_rede
            $table->foreignUuid('turma_origem_id')->nullable()->constrained('educa_school_classes')->nullOnDelete();
            $table->foreignUuid('turma_destino_id')->nullable()->constrained('educa_school_classes')->nullOnDelete();
            $table->string('escola_destino_externa', 150)->nullable();
            $table->string('municipio_destino_externo', 100)->nullable();
            $table->string('uf_destino_externo', 2)->nullable();
            $table->date('data_transferencia');
            $table->text('motivo')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'enrollment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_transfers');
        Schema::dropIfExists('educa_class_enrollments');
        Schema::dropIfExists('educa_enrollments');
        Schema::dropIfExists('educa_student_guardians');
        Schema::dropIfExists('educa_student_profiles');
        Schema::dropIfExists('educa_enrollment_sequences');
    }
};
