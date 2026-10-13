<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Support\MigracaoEscolaId;

/**
 * Formatura: registros passam a pertencer a uma escola (change educacao-multiescola-e-cadastro-pessoas,
 * D3). Roda depois da migration do Escola que cria escola_escolas; os dados existentes vão para a
 * escola do tenant.
 */
return new class extends Migration
{
    private const TABELAS = ['formatura_configuracoes', 'formatura_participacoes', 'formatura_pagamentos'];

    public function up(): void
    {
        MigracaoEscolaId::garantirEscolas(self::TABELAS);

        foreach (self::TABELAS as $tabela) {
            MigracaoEscolaId::adicionar($tabela);
        }

        // Uma formatura por escola e ano letivo (antes: por tenant e ano).
        Schema::table('formatura_configuracoes', function (Blueprint $table): void {
            $table->dropUnique(['tenant_id', 'ano_letivo']);
            $table->unique(['tenant_id', 'escola_id', 'ano_letivo'], 'formatura_configuracoes_escola_ano_unique');
        });
    }

    public function down(): void
    {
        Schema::table('formatura_configuracoes', function (Blueprint $table): void {
            $table->dropUnique('formatura_configuracoes_escola_ano_unique');
            $table->unique(['tenant_id', 'ano_letivo']);
        });

        foreach (array_reverse(self::TABELAS) as $tabela) {
            MigracaoEscolaId::remover($tabela);
        }
    }
};
