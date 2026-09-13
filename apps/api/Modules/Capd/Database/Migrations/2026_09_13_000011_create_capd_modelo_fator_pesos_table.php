<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RF-02: Parametrização de Fatores e Pesos por Formulário.
 *
 * capd_modelo_fator_pesos — pivot entre modelo de formulário e fator de avaliação,
 * com peso percentual independente do peso global do fator.
 *
 * A soma dos pesos DEVE totalizar 100% por modelo — validada no Service.
 * redistribuivel = true indica que o peso deste fator pode ser repartido
 * proporcionalemente aos demais quando o cargo não possui atendimento ao público
 * (art. 25, alínea 'h', da Lei 1.704/2006 — RF-06).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_modelo_fator_pesos', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('modelo_id');
            $table->unsignedBigInteger('fator_id');
            // Peso percentual neste formulário (ex.: 15.00 = 15%)
            $table->decimal('peso', 5, 2);
            // Se true, o peso é redistribuído para outros fatores quando
            // o cargo avaliado não possui atendimento direto ao público.
            $table->boolean('redistribuivel')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->foreign('modelo_id')
                ->references('id')
                ->on('capd_modelos_formulario')
                ->cascadeOnDelete();

            $table->foreign('fator_id')
                ->references('id')
                ->on('capd_fatores_avaliacao')
                ->restrictOnDelete();

            // Unicidade: cada fator aparece uma vez por modelo
            $table->unique(['modelo_id', 'fator_id']);
            $table->index(['tenant_id', 'modelo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_modelo_fator_pesos');
    }
};
