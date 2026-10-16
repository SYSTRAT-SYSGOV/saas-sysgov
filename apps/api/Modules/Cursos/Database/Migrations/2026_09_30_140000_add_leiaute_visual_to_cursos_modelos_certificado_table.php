<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Construtor visual (change cursos-construtor-visual-certificado, D3/D6): o modelo passa a ter
 * tipo `padrao` (leiaute fixo de antes) ou `visual` (fundo + elementos posicionados em pontos),
 * e verso opcional. Modelos existentes ficam `padrao` e o PDF deles não muda.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_modelos_certificado', function (Blueprint $table): void {
            $table->string('tipo', 10)->default('padrao')->after('nome');
            $table->string('orientacao', 10)->default('paisagem')->after('tipo');
            $table->string('fundo_path')->nullable()->after('logotipo_path');
            $table->json('elementos')->nullable()->after('fundo_path');
            $table->boolean('verso_ativo')->default(false)->after('elementos');
            $table->string('verso_fundo_path')->nullable()->after('verso_ativo');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_modelos_certificado', function (Blueprint $table): void {
            $table->dropColumn(['tipo', 'orientacao', 'fundo_path', 'elementos', 'verso_ativo', 'verso_fundo_path']);
        });
    }
};
