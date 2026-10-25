<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Capacidade e Oferta de Vagas por Escola e Turno
        Schema::create('educa_school_capacities', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->foreignUuid('course_id')->nullable()->constrained('educa_courses')->nullOnDelete();
            $table->foreignUuid('grade_id')->nullable()->constrained('educa_grades')->nullOnDelete();
            $table->string('etapa_ensino', 50); // creche_bercario, creche_maternal, pre_escola, fundamental_anos_iniciais, etc.
            $table->string('turno', 30); // matutino, vespertino, noturno, integral
            $table->unsignedInteger('quantidade_salas')->default(1);
            $table->unsignedInteger('capacidade_maxima_alunos')->default(0);
            $table->unsignedInteger('vagas_ocupadas')->default(0);
            $table->unsignedInteger('vagas_reservadas')->default(0);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'academic_year_id']);
            $table->index(['tenant_id', 'etapa_ensino', 'turno']);
        });

        // 2. Solicitações de Inscrição / Pré-Matrícula Municipal
        Schema::create('educa_enrollment_applications', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->string('numero_protocolo', 50);
            $table->foreignId('candidato_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignId('responsavel_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('etapa_ensino', 50);
            $table->string('turno_preferencial', 30)->default('matutino');
            $table->foreignUuid('escola_preferencia_1_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('escola_preferencia_2_id')->nullable()->constrained('educa_schools')->nullOnDelete();
            $table->foreignUuid('escola_preferencia_3_id')->nullable()->constrained('educa_schools')->nullOnDelete();
            $table->string('status', 30)->default('inscrito'); // inscrito, em_analise, classificado, convocado, matriculado, indeferido, desistente
            $table->boolean('criterio_pcd')->default(false);
            $table->boolean('criterio_bolsa_familia')->default(false);
            $table->boolean('criterio_mae_trabalhadora')->default(false);
            $table->boolean('criterio_irmao_escola')->default(false);
            $table->boolean('criterio_zoneamento')->default(false);
            $table->unsignedInteger('pontuacao_total')->default(0);
            $table->text('observacoes_analise')->nullable();
            $table->foreignId('analisado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('analisado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'numero_protocolo']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'candidato_pessoa_id']);
            $table->index(['tenant_id', 'escola_preferencia_1_id', 'etapa_ensino']);
        });

        // 3. Fila de Espera Classificada (Lei Federal nº 14.685/2023)
        Schema::create('educa_waitlists', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('application_id')->constrained('educa_enrollment_applications')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->string('etapa_ensino', 50);
            $table->string('turno', 30)->default('matutino');
            $table->unsignedInteger('posicao')->default(1);
            $table->boolean('prioridade_legal')->default(false);
            $table->unsignedInteger('pontuacao')->default(0);
            $table->string('status', 30)->default('aguardando'); // aguardando, convocado, matriculado, recusou_vaga, cancelado
            $table->timestamp('convocado_em')->nullable();
            $table->timestamp('limite_comparecimento')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'etapa_ensino', 'status', 'posicao'], 'educa_waitlists_ranking_idx');
            $table->index(['tenant_id', 'application_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_waitlists');
        Schema::dropIfExists('educa_enrollment_applications');
        Schema::dropIfExists('educa_school_capacities');
    }
};
