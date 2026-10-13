<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Equipe gestora ligada ao Cadastro de Pessoas (change educacao-multiescola-e-cadastro-pessoas, D7).
 * Membros antigos (só nome) ficam com pessoa_id nulo e continuam funcionando.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escola_equipe', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('escola_id')->constrained('pessoas')->nullOnDelete();
            $table->index(['tenant_id', 'pessoa_id'], 'escola_equipe_tenant_pessoa_index');
        });
    }

    public function down(): void
    {
        Schema::table('escola_equipe', function (Blueprint $table): void {
            $table->dropIndex('escola_equipe_tenant_pessoa_index');
            $table->dropConstrainedForeignId('pessoa_id');
        });
    }
};
