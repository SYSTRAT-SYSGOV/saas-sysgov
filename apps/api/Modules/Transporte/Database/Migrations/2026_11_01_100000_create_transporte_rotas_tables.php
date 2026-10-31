<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Módulo Transporte, Fase 2 (change transporte-fase-2-rotas-e-itinerarios). O total de km é calculado no model
 * (D: igual no SQLite dos testes e no MySQL); a escola de destino é chave comum, sem escopo por escola (D11).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_paradas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->text('descricao')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('cep', 9)->nullable();
            $table->string('logradouro', 200)->nullable();
            $table->string('numero', 20)->nullable();
            $table->string('complemento', 100)->nullable();
            $table->string('bairro', 100)->nullable();
            $table->string('cidade', 100)->nullable();
            $table->string('uf', 2)->nullable();
            $table->string('referencia', 255)->nullable();
            $table->boolean('ativa')->default(true);
            $table->timestamps();
            $table->index(['tenant_id', 'nome'], 'tr_paradas_t_nome_ix');
        });

        Schema::create('transporte_rotas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('escola_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->foreignId('empresa_id')->nullable()->constrained('transporte_empresas')->restrictOnDelete();
            $table->foreignId('veiculo_id')->nullable()->constrained('transporte_veiculos')->restrictOnDelete();
            $table->foreignId('motorista_id')->nullable()->constrained('transporte_motoristas')->restrictOnDelete();
            $table->string('nome', 150);
            $table->string('turno', 10);
            $table->string('tipo_rede', 10);
            $table->decimal('km_pavimentado', 8, 2)->default(0);
            $table->decimal('km_nao_pavimentado', 8, 2)->default(0);
            $table->time('horario_saida')->nullable();
            $table->time('horario_chegada')->nullable();
            $table->time('horario_retorno')->nullable();
            $table->boolean('ativa')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['tenant_id', 'ano_letivo', 'turno'], 'tr_rotas_t_ano_turno_ix');
            $table->index(['tenant_id', 'escola_id'], 'tr_rotas_t_escola_ix');
        });

        Schema::create('transporte_rota_paradas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('rota_id')->constrained('transporte_rotas')->cascadeOnDelete();
            $table->foreignId('parada_id')->constrained('transporte_paradas')->restrictOnDelete();
            $table->unsignedSmallInteger('ordem');
            $table->time('embarque_previsto')->nullable();
            $table->time('desembarque_previsto')->nullable();
            $table->timestamps();
            $table->unique(['rota_id', 'ordem'], 'tr_rota_paradas_ordem_uq');
            $table->unique(['rota_id', 'parada_id'], 'tr_rota_paradas_parada_uq');
            $table->index('tenant_id', 'tr_rota_paradas_t_ix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporte_rota_paradas');
        Schema::dropIfExists('transporte_rotas');
        Schema::dropIfExists('transporte_paradas');
    }
};
