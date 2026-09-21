<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `conteudo` deixa de ser NOT NULL — a obrigatoriedade do Estudo Técnico
 * Preliminar passa a ser uma seção nativa configurável pelo tenant (ver
 * CampoConfiguracaoService::CAMPOS_NATIVOS['etp']), como já é o caso das
 * seções do TR. O default de fábrica (`obrigatorio_padrao`) continua true,
 * então nada muda pra quem nunca reconfigurou o ETP.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licita_etps', function (Blueprint $table): void {
            $table->longText('conteudo')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('licita_etps', function (Blueprint $table): void {
            $table->longText('conteudo')->nullable(false)->change();
        });
    }
};
