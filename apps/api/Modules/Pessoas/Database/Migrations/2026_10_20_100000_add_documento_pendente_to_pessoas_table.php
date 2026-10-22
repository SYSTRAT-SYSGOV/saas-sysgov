<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Pessoa física sem CPF informado (unificar-cadastro-pessoas, D1): `documento` e `documento_hash` passam a
 * aceitar NULL e `documento_pendente` marca quem aguarda regularização. A unicidade
 * (tenant_id, tipo, documento_hash) continua valendo para documentos informados — o índice único do MySQL
 * admite vários NULL. Jurídica segue exigindo CNPJ (regra do modelo e das requisições).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->string('documento')->nullable()->change();
            $table->string('documento_hash', 64)->nullable()->change();
            $table->boolean('documento_pendente')->default(false)->after('documento_hash');
            $table->index(['tenant_id', 'documento_pendente'], 'pessoas_tenant_documento_pendente_idx');
        });
    }

    public function down(): void
    {
        // Sem pessoa pendente a reversão é segura; com pendentes, regularize ou exclua antes.
        if (DB::table('pessoas')->whereNull('documento_hash')->exists()) {
            throw new RuntimeException(
                'Reversão abortada: existem pessoas com documento pendente. Regularize ou exclua antes de reverter.'
            );
        }

        Schema::table('pessoas', function (Blueprint $table): void {
            $table->dropIndex('pessoas_tenant_documento_pendente_idx');
            $table->dropColumn('documento_pendente');
            $table->string('documento')->nullable(false)->change();
            $table->string('documento_hash', 64)->nullable(false)->change();
        });
    }
};
