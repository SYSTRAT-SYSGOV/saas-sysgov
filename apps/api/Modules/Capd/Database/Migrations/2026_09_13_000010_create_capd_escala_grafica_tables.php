<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RF-03: Configuração da Escala Gráfica.
 *
 * capd_escalas_graficas — cabeçalho da escala, versionado por modelo de formulário.
 * capd_escala_niveis    — graus 1-N com rótulo, faixa de pontuação e descrição comportamental.
 */
return new class extends Migration
{
    public function up(): void
    {
        // ── Escala Gráfica (cabeçalho) ─────────────────────────────────
        Schema::create('capd_escalas_graficas', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('modelo_id');
            $table->string('nome', 120);
            $table->text('descricao')->nullable();
            $table->unsignedTinyInteger('qtd_niveis')->default(5); // 3 a 5
            $table->boolean('ativa')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('modelo_id')
                ->references('id')
                ->on('capd_modelos_formulario')
                ->cascadeOnDelete();

            $table->index(['tenant_id', 'modelo_id']);
            $table->unique(['tenant_id', 'modelo_id', 'nome']);
        });

        // ── Níveis / Graus da Escala ────────────────────────────────────
        Schema::create('capd_escala_niveis', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('escala_id');
            // grau: 1 = inferior ... N = superior (ex.: Insuficiente a Excelente)
            $table->unsignedTinyInteger('grau');
            $table->string('rotulo', 60);           // ex.: "Excelente"
            $table->decimal('valor_min', 6, 2);     // pontuação mínima do grau
            $table->decimal('valor_max', 6, 2);     // pontuação máxima do grau
            $table->text('descricao_comportamental')->nullable();
            $table->timestamps();

            $table->foreign('escala_id')
                ->references('id')
                ->on('capd_escalas_graficas')
                ->cascadeOnDelete();

            $table->unique(['escala_id', 'grau']);
            $table->index('escala_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_escala_niveis');
        Schema::dropIfExists('capd_escalas_graficas');
    }
};
