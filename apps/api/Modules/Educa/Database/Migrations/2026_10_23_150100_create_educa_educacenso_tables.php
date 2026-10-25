<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Exportações Oficiais do Educacenso (MEC/INEP)
        Schema::create('educa_census_exports', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->string('etapa_censo', 50)->default('matricula_inicial'); // matricula_inicial, situacao_aluno
            $table->string('status', 30)->default('solicitada'); // solicitada, processando, concluida, falhou
            $table->unsignedInteger('total_linhas')->default(0);
            $table->unsignedInteger('total_erros')->default(0);
            $table->unsignedInteger('total_avisos')->default(0);
            $table->string('checksum_sha256', 64)->nullable();
            $table->string('arquivo_path')->nullable();
            $table->text('erro_detalhe')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'academic_year_id'], 'idx_census_exp_school_year');
            $table->index(['tenant_id', 'status'], 'idx_census_exp_tenant_status');
        });

        // 2. Validações e Diagnósticos de Auditoria Prévia
        Schema::create('educa_census_validations', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->string('tipo_registro', 10); // 00, 10, 20, 30, 40, 50, 60
            $table->string('gravidade', 20)->default('aviso'); // impeditivo, aviso
            $table->string('codigo_regra', 50);
            $table->string('mensagem', 500);
            $table->string('entidade_tipo', 100);
            $table->string('entidade_id', 100);
            $table->string('rota_correcao', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'academic_year_id'], 'idx_census_val_school_year');
            $table->index(['tenant_id', 'gravidade'], 'idx_census_val_tenant_grav');
        });

        // 3. Logs de Conciliação do Arquivo de Retorno do INEP
        Schema::create('educa_census_inep_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->string('tipo_registro', 20);
            $table->string('entidade_tipo', 100);
            $table->string('entidade_id', 100);
            $table->string('codigo_inep', 30);
            $table->string('status', 30)->default('conciliado'); // conciliado, divergente, ignorado
            $table->text('mensagem')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'academic_year_id'], 'idx_census_inep_school_year');
            $table->index(['tenant_id', 'status'], 'idx_census_inep_tenant_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_census_inep_logs');
        Schema::dropIfExists('educa_census_validations');
        Schema::dropIfExists('educa_census_exports');
    }
};
