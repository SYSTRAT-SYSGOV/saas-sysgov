<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Comunicados e Avisos Oficiais
        Schema::create('educa_announcements', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->nullable()->constrained('educa_schools')->nullOnDelete();
            $table->foreignId('autor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('titulo', 150);
            $table->text('conteudo');
            $table->string('urgencia', 20)->default('media'); // baixa, media, alta, urgente
            $table->string('status', 20)->default('publicado'); // rascunho, publicado, arquivado
            $table->date('data_publicacao');
            $table->date('data_expiracao')->nullable();
            $table->unsignedInteger('total_leituras')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status', 'urgencia'], 'idx_announcements_tenant_status');
            $table->index(['tenant_id', 'school_id'], 'idx_announcements_tenant_school');
        });

        // 2. Públicos-Alvo Segmentados do Comunicado
        Schema::create('educa_announcement_audiences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('announcement_id')->constrained('educa_announcements')->cascadeOnDelete();
            $table->string('tipo_alvo', 20); // rede, escola, curso, turma
            $table->uuid('target_id')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'announcement_id'], 'idx_announcement_audiences_ann');
            $table->index(['tenant_id', 'tipo_alvo', 'target_id'], 'idx_announcement_audiences_target');
        });

        // 3. Confirmações de Leitura e Ciência de Comunicados
        Schema::create('educa_announcement_reads', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('announcement_id')->constrained('educa_announcements')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->string('ip_address', 45)->nullable();
            $table->timestamp('read_at');
            $table->timestamps();

            $table->index(['tenant_id', 'announcement_id'], 'idx_announcement_reads_ann');
            $table->unique(['tenant_id', 'announcement_id', 'pessoa_id'], 'uq_announcement_reads_pessoa');
        });

        // 4. Ocorrências Disciplinares e Pedagógicas de Estudantes
        Schema::create('educa_student_incidents', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('enrollment_id')->constrained('educa_enrollments')->cascadeOnDelete();
            $table->foreignId('aluno_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignId('autor_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('numero_sequencial', 30);
            $table->string('tipo', 20); // disciplinar, pedagogica, saude, elogio
            $table->string('gravidade', 20); // baixa, media, alta, gravissima
            $table->text('relato');
            $table->date('data_ocorrencia');
            $table->string('status', 20)->default('aberta'); // aberta, em_analise, concluida, cientificada
            $table->timestamp('data_ciencia')->nullable();
            $table->foreignId('responsavel_ciencia_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'numero_sequencial'], 'uq_incidents_tenant_numero');
            $table->index(['tenant_id', 'school_id', 'status'], 'idx_incidents_tenant_school_status');
            $table->index(['tenant_id', 'enrollment_id'], 'idx_incidents_tenant_enrollment');
        });

        // 5. Ações, Despachos e Providências da Ocorrência
        Schema::create('educa_incident_actions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('incident_id')->constrained('educa_student_incidents')->cascadeOnDelete();
            $table->foreignId('operador_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipo_acao', 100);
            $table->text('descricao');
            $table->boolean('exige_comparecimento')->default(false);
            $table->date('data_acao');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'incident_id'], 'idx_incident_actions_tenant_inc');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_incident_actions');
        Schema::dropIfExists('educa_student_incidents');
        Schema::dropIfExists('educa_announcement_reads');
        Schema::dropIfExists('educa_announcement_audiences');
        Schema::dropIfExists('educa_announcements');
    }
};
