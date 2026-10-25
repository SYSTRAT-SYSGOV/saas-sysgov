<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Prontuário e Perfil de Estudante da Educação Especial (PAEE)
        Schema::create('educa_aee_student_profiles', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->string('tipo_condicao', 50); // deficiencia_fisica, deficiencia_auditiva, deficiencia_visual, deficiencia_intelectual, deficiencia_multipla, surdocegueira, tea, altas_habilidades_superdotacao, investigacao
            $table->string('cid10_codigo', 20)->nullable();
            $table->string('cid11_codigo', 20)->nullable();
            $table->text('diagnostico_descricao')->nullable();
            $table->string('laudo_medico_url', 255)->nullable();
            $table->date('laudo_medico_emitido_em')->nullable();
            $table->date('laudo_medico_expira_em')->nullable();
            $table->string('profissional_emissor', 150)->nullable();
            $table->string('registro_profissional', 50)->nullable();
            $table->boolean('precisa_cuidador')->default(false);
            $table->boolean('precisa_interprete_libras')->default(false);
            $table->boolean('precisa_guia_interprete')->default(false);
            $table->boolean('precisa_transporte_adaptado')->default(false);
            $table->json('barreiras_identificadas')->nullable();
            $table->json('recursos_acessibilidade')->nullable();
            $table->string('status', 30)->default('ativo'); // ativo, em_avaliacao, inativo
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'status']);
            $table->index(['tenant_id', 'pessoa_id']);
            $table->index(['tenant_id', 'tipo_condicao']);
        });

        // 2. Plano Educacional Individualizado (PEI)
        Schema::create('educa_aee_peis', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('student_profile_id')->constrained('educa_aee_student_profiles')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('semestre')->default(1);
            $table->text('habilidades_atuais')->nullable();
            $table->text('necessidades_especificas')->nullable();
            $table->text('adequacoes_curriculares')->nullable();
            $table->text('adaptacoes_avaliativas')->nullable();
            $table->text('metodologias_especificas')->nullable();
            $table->text('parecer_descritivo')->nullable();
            $table->string('status', 30)->default('rascunho'); // rascunho, ativo, revisado, concluido
            $table->foreignId('elaborado_por_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'student_profile_id', 'ano_letivo']);
            $table->index(['tenant_id', 'status']);
        });

        // 3. Metas Pedagógicas do PEI
        Schema::create('educa_aee_pei_goals', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('pei_id')->constrained('educa_aee_peis')->cascadeOnDelete();
            $table->string('area_desenvolvimento', 50); // cognitiva, comunicacao_linguagem, socioemocional, psicomotora, autonomia_vida_diaria
            $table->text('objetivo');
            $table->text('estrategias')->nullable();
            $table->text('recursos')->nullable();
            $table->text('indicadores_sucesso')->nullable();
            $table->date('prazo_previsto')->nullable();
            $table->string('status', 30)->default('em_andamento'); // em_andamento, atingido, parcialmente_atingido, cancelado
            $table->text('avaliacao_resultado')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'pei_id', 'area_desenvolvimento']);
        });

        // 4. Salas de Recursos Multifuncionais (SRM)
        Schema::create('educa_aee_resource_rooms', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('tipo_sala', 50)->default('tipo_1_generica'); // tipo_1_generica, tipo_2_surdez_cegueira, polo_municipal
            $table->unsignedInteger('capacidade_atendimento')->default(15);
            $table->json('equipamentos_disponiveis')->nullable();
            $table->json('horarios_disponiveis')->nullable();
            $table->boolean('is_polo')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'is_active']);
        });

        // 5. Enturmação e Matrícula de Dupla Entrada na Sala de Recursos (Contraturno)
        Schema::create('educa_aee_enrollments', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('student_profile_id')->constrained('educa_aee_student_profiles')->cascadeOnDelete();
            $table->foreignUuid('resource_room_id')->constrained('educa_aee_resource_rooms')->cascadeOnDelete();
            $table->foreignUuid('regular_enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->string('turno_atendimento', 30); // manha, tarde, noite
            $table->json('dias_semana')->nullable();
            $table->string('horario_inicio', 10)->nullable();
            $table->string('horario_fim', 10)->nullable();
            $table->unsignedTinyInteger('frequencia_semanal')->default(2);
            $table->string('status', 30)->default('ativo'); // ativo, transferido, cancelado
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'student_profile_id', 'status']);
            $table->index(['tenant_id', 'resource_room_id', 'turno_atendimento']);
        });

        // 6. Alocação de Profissionais de Apoio Escolar (Cuidadores e Intérpretes)
        Schema::create('educa_aee_support_allocations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('student_profile_id')->constrained('educa_aee_student_profiles')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('caregiver_employee_id')->constrained('educa_employees')->cascadeOnDelete();
            $table->string('tipo_apoio', 50); // cuidador_alimentacao_higiene, interprete_libras, guia_interprete, mediador_pedagogico
            $table->string('turno', 30); // manha, tarde, integral
            $table->unsignedInteger('carga_horaria_semanal')->default(20);
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->text('observacoes')->nullable();
            $table->string('status', 30)->default('ativo'); // ativo, suspenso, finalizado
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'caregiver_employee_id', 'status']);
            $table->index(['tenant_id', 'student_profile_id', 'status']);
            $table->index(['tenant_id', 'school_id', 'turno']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_aee_support_allocations');
        Schema::dropIfExists('educa_aee_enrollments');
        Schema::dropIfExists('educa_aee_resource_rooms');
        Schema::dropIfExists('educa_aee_pei_goals');
        Schema::dropIfExists('educa_aee_peis');
        Schema::dropIfExists('educa_aee_student_profiles');
    }
};
