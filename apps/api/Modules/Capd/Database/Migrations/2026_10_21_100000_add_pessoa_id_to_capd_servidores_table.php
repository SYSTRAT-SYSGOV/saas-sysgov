<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Servidor ligado ao Cadastro de Pessoas (unificar-pessoas-fase-2-capd). Nullable até a conciliação dos
 * servidores existentes; as colunas civis continuam como cópia de exibição até a Fase 5.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->after('user_id')->constrained('pessoas')->nullOnDelete();
            $table->index(['tenant_id', 'pessoa_id'], 'capd_servidores_tenant_pessoa_index');
        });
    }

    public function down(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropIndex('capd_servidores_tenant_pessoa_index');
            $table->dropConstrainedForeignId('pessoa_id');
        });
    }
};
