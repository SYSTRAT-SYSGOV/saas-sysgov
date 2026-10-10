<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Support\MigracaoEscolaId;

/**
 * Pedagogico: registros passam a pertencer a uma escola (change educacao-multiescola-e-cadastro-pessoas,
 * D3). Roda depois da migration do Escola que cria escola_escolas; os dados existentes vão para a
 * escola do tenant.
 */
return new class extends Migration
{
    private const TABELAS = ['pedagogico_notas', 'pedagogico_ocorrencias', 'pedagogico_pre_conselhos', 'pedagogico_pre_conselho_alunos', 'pedagogico_cronogramas', 'pedagogico_atas', 'pedagogico_frequencias'];

    public function up(): void
    {
        MigracaoEscolaId::garantirEscolas(self::TABELAS);

        foreach (self::TABELAS as $tabela) {
            MigracaoEscolaId::adicionar($tabela);
        }
    }

    public function down(): void
    {
        foreach (array_reverse(self::TABELAS) as $tabela) {
            MigracaoEscolaId::remover($tabela);
        }
    }
};
