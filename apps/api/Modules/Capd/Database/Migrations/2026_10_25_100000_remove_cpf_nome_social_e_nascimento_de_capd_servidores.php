<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Services\TravaRemocaoColunasService;

/**
 * Fase 5, etapa B do Capd (unificar-pessoas-fase-5-remocao-colunas, item 2.2): o servidor deixa de guardar `cpf`,
 * `nome_social` e `data_nascimento` (vivem na pessoa do cadastro central) e passa a exigir `pessoa_id`. `nome_completo`
 * fica como cópia derivada (busca e ordenação) e `email`, `telefone` e `pis_pasep` não saem.
 *
 * DESTRUTIVA. Só roda com a trava liberada (todo servidor com pessoa e nenhuma divergência aberta, em todos os
 * tenants) e depois de um backup verificado. O `down()` só recria a estrutura (colunas e índice, vazios): o CPF, o nome
 * social e o nascimento removidos existem apenas no backup.
 */
return new class extends Migration
{
    public function up(): void
    {
        app(TravaRemocaoColunasService::class)->exigir('capd');

        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropIndex(['tenant_id', 'cpf']);
        });
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropColumn(['cpf', 'nome_social', 'data_nascimento']);
        });

        // A chave era `nullOnDelete`: com `pessoa_id` obrigatório, apagar a pessoa passa a ser recusado.
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropForeign(['pessoa_id']);
        });
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->unsignedBigInteger('pessoa_id')->nullable(false)->change();
        });
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->foreign('pessoa_id')->references('id')->on('pessoas');
        });
    }

    public function down(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropForeign(['pessoa_id']);
        });
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->unsignedBigInteger('pessoa_id')->nullable()->change();
        });
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->foreign('pessoa_id')->references('id')->on('pessoas')->nullOnDelete();
            $table->string('cpf', 14)->nullable()->after('matricula');
            $table->string('nome_social', 150)->nullable();
            $table->date('data_nascimento')->nullable();
            $table->index(['tenant_id', 'cpf']);
        });
    }
};
