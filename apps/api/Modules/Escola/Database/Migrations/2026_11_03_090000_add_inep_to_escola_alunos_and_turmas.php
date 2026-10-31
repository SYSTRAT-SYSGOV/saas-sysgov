<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Códigos Inep do aluno e da turma (change transporte-fase-4-censo-e-painel, D30): opcionais, para o Censo Escolar.
 * Únicos por tenant quando preenchidos (valores nulos não colidem).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->string('inep_id', 20)->nullable()->after('cgm');
            $table->unique(['tenant_id', 'inep_id'], 'escola_alunos_t_inep_uq');
        });
        Schema::table('escola_turmas', function (Blueprint $table): void {
            $table->string('inep', 20)->nullable()->after('nome');
            $table->unique(['tenant_id', 'inep'], 'escola_turmas_t_inep_uq');
        });
    }

    public function down(): void
    {
        Schema::table('escola_turmas', function (Blueprint $table): void {
            $table->dropUnique('escola_turmas_t_inep_uq');
            $table->dropColumn('inep');
        });
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->dropUnique('escola_alunos_t_inep_uq');
            $table->dropColumn('inep_id');
        });
    }
};
