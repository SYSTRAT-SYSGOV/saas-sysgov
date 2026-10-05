<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Checagem defensiva: o backfill de `tipo='fisica'` preserva a mesma cardinalidade da
        // unicidade antiga (tenant_id, cpf_hash), então não deveria existir duplicidade latente
        // aqui — ver design.md Decisão 2. Aborta antes de criar o índice se encontrar alguma.
        $duplicado = DB::table('pessoas')
            ->select('tenant_id', 'tipo', 'documento_hash')
            ->whereNull('deleted_at')
            ->groupBy('tenant_id', 'tipo', 'documento_hash')
            ->havingRaw('COUNT(*) > 1')
            ->first();

        if ($duplicado !== null) {
            throw new RuntimeException(
                'Migração abortada: existe duplicidade latente de (tenant_id, tipo, documento_hash) '
                . 'em pessoas — corrija os dados antes de aplicar o novo índice único.'
            );
        }

        Schema::table('pessoas', function (Blueprint $table): void {
            $table->dropUnique('pessoas_tenant_id_cpf_hash_unique');
            $table->unique(['tenant_id', 'tipo', 'documento_hash']);
        });
    }

    public function down(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->dropUnique(['tenant_id', 'tipo', 'documento_hash']);
            $table->unique(['tenant_id', 'documento_hash'], 'pessoas_tenant_id_cpf_hash_unique');
        });
    }
};
