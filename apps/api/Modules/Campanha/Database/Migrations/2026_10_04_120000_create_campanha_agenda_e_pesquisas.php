<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Agenda (eventos, reuniões e visitas — D6) e pesquisas eleitorais com resultados estruturados (D7). Percentuais e
 * margem de erro em décimos inteiros (2,5% → 25).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_eventos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->unsignedInteger('codigo_ibge');
            $table->string('local', 255);
            $table->dateTime('inicio');
            $table->foreignId('responsavel_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('publico_estimado')->default(0);
            $table->unsignedInteger('publico_presente')->default(0);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'inicio']);
        });

        Schema::create('campanha_reunioes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->string('titulo', 200);
            $table->unsignedInteger('codigo_ibge');
            $table->string('local', 255)->nullable();
            $table->dateTime('inicio');
            $table->text('participantes')->nullable();
            $table->text('ata')->nullable();
            $table->text('pendencias')->nullable();
            $table->foreignId('responsavel_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('prazo_pendencias')->nullable();
            $table->boolean('pendencias_resolvidas')->default(false);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'inicio']);
        });

        Schema::create('campanha_visitas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->string('lideranca', 200);
            $table->unsignedInteger('codigo_ibge');
            $table->string('bairro', 150)->nullable();
            $table->date('data');
            $table->text('assunto');
            $table->text('resultado')->nullable();
            $table->text('encaminhamento')->nullable();
            $table->foreignId('demanda_id')->nullable()->constrained('campanha_demandas')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'data']);
        });

        Schema::create('campanha_pesquisas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->string('tipo', 10);
            $table->string('instituto', 200);
            $table->date('divulgada_em');
            $table->unsignedInteger('codigo_ibge')->nullable();
            $table->unsignedSmallInteger('margem_erro_decimos')->default(0);
            $table->unsignedInteger('amostra')->nullable();
            $table->string('registro_tse', 30)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'divulgada_em']);
        });

        Schema::create('campanha_pesquisa_resultados', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pesquisa_id')->constrained('campanha_pesquisas')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->string('partido', 30)->nullable();
            $table->unsignedSmallInteger('percentual_decimos');
            $table->boolean('da_campanha')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);

            $table->index(['tenant_id', 'pesquisa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_pesquisa_resultados');
        Schema::dropIfExists('campanha_pesquisas');
        Schema::dropIfExists('campanha_visitas');
        Schema::dropIfExists('campanha_reunioes');
        Schema::dropIfExists('campanha_eventos');
    }
};
