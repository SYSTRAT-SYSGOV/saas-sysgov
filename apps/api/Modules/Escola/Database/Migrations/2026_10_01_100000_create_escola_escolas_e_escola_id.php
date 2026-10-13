<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Modules\Escola\Support\MigracaoEscolaId;

/**
 * Várias escolas por prefeitura (change educacao-multiescola-e-cadastro-pessoas, D1/D3).
 *
 * 1. Cria `escola_escolas` e, para cada tenant que já usa o módulo, uma escola a partir da antiga
 *    `escola_unidades` (nome e logo) — os dados existentes viram a escola nº 1 do tenant.
 * 2. Adiciona `escola_id` às tabelas do Escola, preenche com a escola do tenant e só depois torna a
 *    coluna obrigatória.
 *
 * `escola_unidades` é mantida (rollback); o código passa a usar só `escola_escolas`. Usa o query
 * builder puro: escopos globais dos models não podem interferir na migração.
 */
return new class extends Migration
{
    /** Tabelas do módulo Escola que passam a pertencer a uma escola. */
    public const TABELAS = [
        'escola_turnos', 'escola_turmas', 'escola_alunos', 'escola_aluno_contatos', 'escola_materias',
        'escola_turma_materias', 'escola_trimestres', 'escola_categorias_ocorrencia', 'escola_equipe',
    ];

    public function up(): void
    {
        Schema::create('escola_escolas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->nullable()->constrained('org_units')->nullOnDelete();
            $table->string('nome', 150);
            $table->string('inep', 20)->nullable();
            $table->string('logo_path')->nullable();
            $table->boolean('ativa')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ativa']);
            $table->unique(['tenant_id', 'inep']);
        });

        MigracaoEscolaId::garantirEscolas(['escola_unidades', ...self::TABELAS]);

        foreach (self::TABELAS as $tabela) {
            MigracaoEscolaId::adicionar($tabela);
        }
    }

    public function down(): void
    {
        foreach (array_reverse(self::TABELAS) as $tabela) {
            MigracaoEscolaId::remover($tabela);
        }
        Schema::dropIfExists('escola_escolas');
    }
};
