<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Módulo Transporte, Fase 1 (change transporte-fase-1-fundacao-e-frota). Empresa = pessoa jurídica e motorista =
 * pessoa física do Cadastro de Pessoas (design D4): nada de cadastro paralelo de pessoas. A regularidade do veículo
 * vem da vistoria de maior validade, não de colunas copiadas no veículo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_empresas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->restrictOnDelete();
            $table->string('tipo', 20);
            $table->string('contrato_numero', 100);
            $table->date('vigencia_inicio');
            $table->date('vigencia_fim');
            $table->boolean('ativa')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'pessoa_id'], 'tr_empresas_t_pessoa_uq');
            $table->index(['tenant_id', 'vigencia_fim'], 'tr_empresas_t_vigencia_ix');
        });

        Schema::create('transporte_motoristas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->restrictOnDelete();
            $table->foreignId('empresa_id')->nullable()->constrained('transporte_empresas')->nullOnDelete();
            $table->string('cnh_numero', 30);
            $table->string('cnh_categoria', 1);
            $table->date('cnh_primeira_habilitacao')->nullable();
            $table->date('cnh_validade');
            $table->string('curso_certificado', 100)->nullable();
            $table->date('curso_validade')->nullable();
            $table->date('toxicologico_data')->nullable();
            $table->date('toxicologico_validade')->nullable();
            $table->boolean('ativo')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'pessoa_id'], 'tr_motoristas_t_pessoa_uq');
            $table->unique(['tenant_id', 'cnh_numero'], 'tr_motoristas_t_cnh_uq');
            $table->index(['tenant_id', 'ativo'], 'tr_motoristas_t_ativo_ix');
        });

        Schema::create('transporte_veiculos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('origem', 20);
            $table->foreignId('empresa_id')->nullable()->constrained('transporte_empresas')->restrictOnDelete();
            $table->foreignId('motorista_padrao_id')->nullable()->constrained('transporte_motoristas')->nullOnDelete();
            $table->string('descricao', 255);
            $table->string('placa', 20);
            $table->string('renavam', 30)->nullable();
            $table->string('chassi', 30)->nullable();
            $table->string('marca_modelo', 150)->nullable();
            $table->unsignedSmallInteger('ano_fabricacao')->nullable();
            $table->unsignedSmallInteger('ano_modelo')->nullable();
            $table->date('data_licenca')->nullable();
            $table->unsignedSmallInteger('capacidade');
            $table->string('tipo_rede', 10);
            $table->unsignedTinyInteger('tipologia_inep');
            $table->boolean('uso_exclusivo')->default(true);
            $table->boolean('acessivel')->default(false);
            $table->boolean('ativo')->default(true);
            $table->text('motivo_inativacao')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'placa'], 'tr_veiculos_t_placa_uq');
            $table->index(['tenant_id', 'ativo'], 'tr_veiculos_t_ativo_ix');
            $table->index(['tenant_id', 'empresa_id'], 'tr_veiculos_t_empresa_ix');
        });

        Schema::create('transporte_vistorias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('veiculo_id')->constrained('transporte_veiculos')->cascadeOnDelete();
            $table->date('data_vistoria');
            $table->string('certificado', 100);
            $table->date('validade');
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'veiculo_id', 'validade'], 'tr_vistorias_t_veic_val_ix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporte_vistorias');
        Schema::dropIfExists('transporte_veiculos');
        Schema::dropIfExists('transporte_motoristas');
        Schema::dropIfExists('transporte_empresas');
    }
};
