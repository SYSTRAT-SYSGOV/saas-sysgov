<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Services\TravaRemocaoColunasService;

/**
 * Fase 5, etapa B dos Cemitérios (unificar-pessoas-fase-5-remocao-colunas, item 3.2): operador e herdeiro de sucessão
 * deixam de guardar o documento (`cemetery_operators.cpf_cnpj` e `documento_hash`, `sucessao_herdeiros.documento`), que
 * vive na pessoa do cadastro central, e passam a exigir `pessoa_id`.
 *
 * DESTRUTIVA. Só roda com a trava liberada (todo registro com pessoa e nenhuma divergência aberta, em todos os
 * tenants) e depois de um backup verificado. O `down()` só recria a estrutura (colunas vazias): o documento removido
 * existe apenas no backup. Concessionários (`concession_holders`) ficam de fora: o portal Gov.br os autentica pelo
 * documento.
 */
return new class extends Migration
{
    public function up(): void
    {
        $trava = app(TravaRemocaoColunasService::class);
        $trava->exigir('cemiterios-operadores');
        $trava->exigir('cemiterios-herdeiros');

        Schema::table('cemetery_operators', function (Blueprint $table): void {
            $table->dropColumn(['cpf_cnpj', 'documento_hash']);
        });
        Schema::table('sucessao_herdeiros', function (Blueprint $table): void {
            $table->dropColumn('documento');
        });

        // A chave era `nullOnDelete`: com `pessoa_id` obrigatório, apagar a pessoa passa a ser recusado.
        foreach (['cemetery_operators', 'sucessao_herdeiros'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table): void {
                $table->dropForeign(['pessoa_id']);
            });
            Schema::table($tabela, function (Blueprint $table): void {
                $table->unsignedBigInteger('pessoa_id')->nullable(false)->change();
            });
            Schema::table($tabela, function (Blueprint $table): void {
                $table->foreign('pessoa_id')->references('id')->on('pessoas');
            });
        }
    }

    public function down(): void
    {
        foreach (['cemetery_operators', 'sucessao_herdeiros'] as $tabela) {
            Schema::table($tabela, function (Blueprint $table): void {
                $table->dropForeign(['pessoa_id']);
            });
            Schema::table($tabela, function (Blueprint $table): void {
                $table->unsignedBigInteger('pessoa_id')->nullable()->change();
            });
            Schema::table($tabela, function (Blueprint $table): void {
                $table->foreign('pessoa_id')->references('id')->on('pessoas')->nullOnDelete();
            });
        }

        Schema::table('sucessao_herdeiros', function (Blueprint $table): void {
            $table->string('documento', 50)->nullable();
        });
        Schema::table('cemetery_operators', function (Blueprint $table): void {
            $table->string('cpf_cnpj', 255)->nullable();
            $table->string('documento_hash', 64)->nullable();
        });
    }
};
