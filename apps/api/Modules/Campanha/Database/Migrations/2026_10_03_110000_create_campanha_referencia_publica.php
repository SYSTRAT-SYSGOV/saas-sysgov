<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Base territorial pública por UF (D3) — exceção deliberada ao tenant_id: são dados públicos do IBGE e
 * do TSE, iguais para todos os clientes, carregados só pelo comando de importação (D4) e nunca escritos
 * por rotas de tenant. Os dados estratégicos de cada campanha ficam em tabelas próprias.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_ref_municipios', function (Blueprint $table): void {
            $table->unsignedInteger('codigo_ibge')->primary();
            $table->char('uf', 2);
            $table->string('nome', 150);
            $table->string('nome_normalizado', 150);
            $table->string('codigo_tse', 10)->nullable();
            $table->string('mesorregiao', 150)->nullable();
            $table->string('microrregiao', 150)->nullable();
            $table->string('regiao_intermediaria', 150)->nullable();
            $table->string('regiao_imediata', 150)->nullable();
            $table->unsignedInteger('populacao')->nullable();
            $table->unsignedSmallInteger('ano_populacao')->nullable();
            $table->unsignedInteger('eleitores')->nullable();
            $table->unsignedSmallInteger('zonas')->nullable();
            $table->unsignedInteger('secoes')->nullable();
            $table->unsignedSmallInteger('ano_eleitorado')->nullable();
            $table->timestamps();

            $table->index(['uf', 'nome_normalizado']);
            $table->index(['uf', 'codigo_tse']);
        });

        Schema::create('campanha_ref_mandatarios', function (Blueprint $table): void {
            $table->id();
            $table->char('uf', 2);
            $table->unsignedInteger('codigo_ibge');
            $table->string('cargo', 20);
            $table->string('nome', 200);
            $table->string('nome_urna', 200)->nullable();
            $table->string('partido', 30)->nullable();
            $table->string('numero', 10)->nullable();
            $table->string('situacao', 40)->nullable();
            $table->unsignedSmallInteger('ano_eleicao');
            $table->date('data_eleicao')->nullable();
            $table->timestamps();

            $table->index(['uf', 'ano_eleicao']);
            $table->index(['codigo_ibge', 'cargo']);
        });

        Schema::create('campanha_ref_malhas', function (Blueprint $table): void {
            $table->char('uf', 2)->primary();
            $table->longText('geojson');
            $table->string('qualidade', 20);
            $table->string('fonte', 255);
            $table->timestamps();
        });

        Schema::create('campanha_ref_importacoes', function (Blueprint $table): void {
            $table->id();
            $table->char('uf', 2);
            $table->string('situacao', 20);
            $table->json('resumo')->nullable();
            $table->timestamp('iniciado_em');
            $table->timestamp('concluido_em')->nullable();
            $table->timestamps();

            $table->index(['uf', 'iniciado_em']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_ref_importacoes');
        Schema::dropIfExists('campanha_ref_malhas');
        Schema::dropIfExists('campanha_ref_mandatarios');
        Schema::dropIfExists('campanha_ref_municipios');
    }
};
