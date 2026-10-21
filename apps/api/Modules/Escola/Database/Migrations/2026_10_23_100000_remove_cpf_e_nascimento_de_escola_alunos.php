<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Services\TravaRemocaoColunasService;

/**
 * Fase 5, etapa B do Escola (unificar-pessoas-fase-5-remocao-colunas, itens 1.4 e 1.5): o aluno deixa de guardar
 * CPF, hash do CPF e nascimento (vivem na pessoa do cadastro central) e passa a exigir `pessoa_id`.
 *
 * DESTRUTIVA. Só roda com a trava liberada (todo aluno com pessoa e nenhuma divergência aberta, em todos os
 * tenants) e depois de um backup verificado. O `down()` só recria a estrutura (colunas e índice, vazios): o CPF e o
 * nascimento removidos existem apenas no backup. A unicidade de CPF por escola passa a ser garantida pelo serviço,
 * pelo documento da pessoa.
 */
return new class extends Migration
{
    public function up(): void
    {
        app(TravaRemocaoColunasService::class)->exigir('escola');

        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->dropUnique('escola_alunos_escola_cpf_unique');
        });
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->dropColumn(['cpf', 'cpf_hash', 'nascimento']);
        });

        // A chave era `nullOnDelete`: com `pessoa_id` obrigatório, apagar a pessoa passa a ser recusado.
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->dropForeign(['pessoa_id']);
        });
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->unsignedBigInteger('pessoa_id')->nullable(false)->change();
        });
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->foreign('pessoa_id')->references('id')->on('pessoas');
        });
    }

    public function down(): void
    {
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->dropForeign(['pessoa_id']);
        });
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->unsignedBigInteger('pessoa_id')->nullable()->change();
        });
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->foreign('pessoa_id')->references('id')->on('pessoas')->nullOnDelete();
            $table->text('cpf')->nullable()->after('nome');
            $table->string('cpf_hash', 64)->nullable()->after('cpf');
            $table->date('nascimento')->nullable();
            $table->unique(['tenant_id', 'escola_id', 'cpf_hash'], 'escola_alunos_escola_cpf_unique');
        });
    }
};
