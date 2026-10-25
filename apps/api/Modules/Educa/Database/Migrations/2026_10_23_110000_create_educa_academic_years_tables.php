<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Catálogo de Tipos de Etapa (Bimestral, Trimestral, Semestral)
        Schema::create('educa_stage_types', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->unsignedTinyInteger('num_etapas')->default(4);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ativo']);
            $table->unique(['tenant_id', 'nome']);
        });

        // 2. Anos Letivos por Escola (Ciclo de Vida LDB)
        Schema::create('educa_academic_years', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->uuid('school_id')->index(); // Vínculo com OrgUnit / Unidade Escolar
            $table->unsignedSmallInteger('ano'); // Ex: 2026
            $table->string('status', 30)->default('planning'); // planning, active, frozen, evaluation_phase, closed
            $table->boolean('is_immutable')->default(false);
            $table->foreignUuid('tipo_etapa_id')->nullable()->constrained('educa_stage_types')->nullOnDelete();
            $table->date('data_inicio')->nullable();
            $table->date('data_fim')->nullable();
            $table->boolean('copiou_turmas')->default(false);
            $table->boolean('copiou_dados_professor')->default(false);
            $table->boolean('copiou_dados_demais_servidores')->default(false);
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Unicidade de ano letivo por escola dentro do tenant
            $table->unique(['tenant_id', 'school_id', 'ano']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'ano']);
        });

        // 3. Etapas do Ano Letivo (Bimestres, Trimestres, Semestres)
        Schema::create('educa_academic_stages', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->constrained('educa_academic_years')->cascadeOnDelete();
            $table->unsignedTinyInteger('sequencial'); // 1, 2, 3, 4...
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->unsignedSmallInteger('dias_letivos')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(
                ['tenant_id', 'academic_year_id', 'sequencial'],
                'educa_stages_tenant_year_seq_unique',
            );
            $table->index(['tenant_id', 'academic_year_id']);
            $table->index(['tenant_id', 'data_inicio', 'data_fim']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_academic_stages');
        Schema::dropIfExists('educa_academic_years');
        Schema::dropIfExists('educa_stage_types');
    }
};
