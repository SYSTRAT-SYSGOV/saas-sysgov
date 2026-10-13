<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Aluno ligado ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, D5/D6).
 * CPF opcional, cifrado, com hash (mesmo HMAC do módulo Pessoas) só para busca e unicidade por
 * escola. Com CPF, o aluno aponta para a pessoa do município (pessoa_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('escola_id')->constrained('pessoas')->nullOnDelete();
            $table->text('cpf')->nullable()->after('nome');
            $table->string('cpf_hash', 64)->nullable()->after('cpf');

            $table->unique(['tenant_id', 'escola_id', 'cpf_hash'], 'escola_alunos_escola_cpf_unique');
            $table->index(['tenant_id', 'pessoa_id'], 'escola_alunos_tenant_pessoa_index');
        });
    }

    public function down(): void
    {
        Schema::table('escola_alunos', function (Blueprint $table): void {
            $table->dropIndex('escola_alunos_tenant_pessoa_index');
            $table->dropUnique('escola_alunos_escola_cpf_unique');
            $table->dropConstrainedForeignId('pessoa_id');
            $table->dropColumn(['cpf', 'cpf_hash']);
        });
    }
};
