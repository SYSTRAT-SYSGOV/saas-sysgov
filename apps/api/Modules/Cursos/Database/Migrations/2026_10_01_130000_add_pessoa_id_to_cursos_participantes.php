<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Participante ligado ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, D9).
 * Só pessoa física com CPF; empresa (CNPJ) e quem não tem CPF ficam com pessoa_id nulo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('user_id')->constrained('pessoas')->nullOnDelete();
            $table->unique(['tenant_id', 'pessoa_id'], 'cursos_participantes_tenant_pessoa_unique');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->dropUnique('cursos_participantes_tenant_pessoa_unique');
            $table->dropConstrainedForeignId('pessoa_id');
        });
    }
};
