<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * LGPD da captação de eleitores (Fase 2A, D4): termo de privacidade com versão, encarregado, prazo de retenção
 * após o encerramento e a data de encerramento da campanha (base da anonimização — D5).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campanha_campanhas', function (Blueprint $table): void {
            $table->text('lgpd_termo')->nullable()->after('faixas_meta');
            $table->unsignedInteger('lgpd_termo_versao')->default(1)->after('lgpd_termo');
            $table->string('lgpd_encarregado_nome', 200)->nullable()->after('lgpd_termo_versao');
            $table->string('lgpd_encarregado_contato', 200)->nullable()->after('lgpd_encarregado_nome');
            $table->unsignedSmallInteger('lgpd_retencao_dias')->default(90)->after('lgpd_encarregado_contato');
            $table->timestamp('encerrada_em')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('campanha_campanhas', function (Blueprint $table): void {
            $table->dropColumn(['lgpd_termo', 'lgpd_termo_versao', 'lgpd_encarregado_nome', 'lgpd_encarregado_contato', 'lgpd_retencao_dias', 'encerrada_em']);
        });
    }
};
