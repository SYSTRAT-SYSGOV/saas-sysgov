<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dados estratégicos de cada campanha (D5, D8–D10): município na campanha (linha criada na primeira
 * alteração), coordenadores, cabos eleitorais, relação com o prefeito e vereadores. Tudo por tenant e
 * por campanha; o município é o código IBGE da base pública.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_coordenadores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedBigInteger('pessoa_id')->nullable();
            $table->string('nome', 200);
            $table->string('tipo', 20);
            $table->unsignedInteger('codigo_ibge')->nullable();
            $table->string('regiao', 150)->nullable();
            $table->unsignedInteger('meta_votos')->default(0);
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'tipo']);
        });

        Schema::create('campanha_municipios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedInteger('codigo_ibge');
            $table->string('situacao', 20)->default('sem_atuacao');
            $table->unsignedInteger('meta_votos')->default(0);
            $table->unsignedInteger('votos_anterior')->default(0);
            $table->foreignId('coordenador_id')->nullable()->constrained('campanha_coordenadores')->nullOnDelete();
            $table->text('potencial')->nullable();
            $table->text('historico')->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'campanha_id', 'situacao']);
        });

        Schema::create('campanha_cabos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedBigInteger('pessoa_id')->nullable();
            $table->string('nome', 200);
            $table->unsignedInteger('codigo_ibge');
            $table->string('bairro', 150)->nullable();
            $table->string('endereco', 255)->nullable();
            $table->foreignId('coordenador_id')->nullable()->constrained('campanha_coordenadores')->nullOnDelete();
            $table->unsignedInteger('votos_estimados')->default(0);
            $table->string('area_atuacao', 255)->nullable();
            $table->string('disponibilidade', 255)->nullable();
            $table->boolean('veiculo_proprio')->default(false);
            $table->boolean('ajuda_custo')->default(false);
            $table->unsignedBigInteger('valor_ajuda_centavos')->default(0);
            $table->string('pix', 150)->nullable();
            $table->string('banco', 100)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('instagram', 100)->nullable();
            $table->string('facebook', 100)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'campanha_id', 'coordenador_id']);
        });

        Schema::create('campanha_prefeitos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedInteger('codigo_ibge');
            $table->string('relacao', 20);
            $table->string('influencia', 10)->default('media');
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'campanha_id', 'relacao']);
        });

        Schema::create('campanha_vereadores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedInteger('codigo_ibge');
            $table->unsignedBigInteger('ref_mandatario_id')->nullable();
            $table->string('nome', 200);
            $table->string('partido', 30)->nullable();
            $table->string('numero', 10)->nullable();
            $table->string('mandato', 100)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('instagram', 100)->nullable();
            $table->string('facebook', 100)->nullable();
            $table->boolean('aliado')->default(false);
            $table->unsignedInteger('votos_estimados')->default(0);
            $table->string('dobradinha', 255)->nullable();
            $table->string('apoio_presidente', 200)->nullable();
            $table->string('apoio_governador', 200)->nullable();
            $table->string('apoio_senador', 200)->nullable();
            $table->string('apoio_dep_federal', 200)->nullable();
            $table->string('apoio_dep_estadual', 200)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'campanha_id', 'aliado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_vereadores');
        Schema::dropIfExists('campanha_prefeitos');
        Schema::dropIfExists('campanha_cabos');
        Schema::dropIfExists('campanha_municipios');
        Schema::dropIfExists('campanha_coordenadores');
    }
};
