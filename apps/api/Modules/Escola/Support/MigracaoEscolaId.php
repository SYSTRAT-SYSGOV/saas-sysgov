<?php

declare(strict_types=1);

namespace Modules\Escola\Support;

use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Apoio às migrations que passam tabelas de educação a pertencer a uma escola (D3): usado pelas
 * migrations de Escola, Pedagógico, Formatura e Passeio. Antes de rodar, cada tenant que tem
 * dados já tem a sua escola em `escola_escolas` (criada pela migration do Escola).
 */
final class MigracaoEscolaId
{
    /** Adiciona escola_id (nulo), preenche com a escola do tenant de cada linha e torna obrigatório. */
    public static function adicionar(string $tabela): void
    {
        Schema::table($tabela, function (Blueprint $table) use ($tabela): void {
            $table->foreignId('escola_id')->nullable()->after('tenant_id')->constrained('escola_escolas')->restrictOnDelete();
            $table->index(['tenant_id', 'escola_id'], "{$tabela}_tenant_escola_index");
        });

        DB::table($tabela)->whereNull('escola_id')->update([
            'escola_id' => DB::raw("(select min(e.id) from escola_escolas e where e.tenant_id = {$tabela}.tenant_id)"),
        ]);

        Schema::table($tabela, function (Blueprint $table): void {
            $table->unsignedBigInteger('escola_id')->nullable(false)->change();
        });
    }

    public static function remover(string $tabela): void
    {
        Schema::table($tabela, function (Blueprint $table) use ($tabela): void {
            $table->dropIndex("{$tabela}_tenant_escola_index");
            $table->dropConstrainedForeignId('escola_id');
        });
    }

    /**
     * Garante uma escola para cada tenant que tem linhas nas tabelas informadas.
     *
     * @param list<string> $tabelas
     */
    public static function garantirEscolas(array $tabelas): void
    {
        $tenants = collect($tabelas)
            ->flatMap(fn (string $t) => DB::table($t)->distinct()->pluck('tenant_id'))
            ->unique()
            ->reject(fn ($tenantId) => DB::table('escola_escolas')->where('tenant_id', $tenantId)->exists())
            ->values();

        foreach ($tenants as $tenantId) {
            $unidade = DB::table('escola_unidades')->where('tenant_id', $tenantId)->first();
            DB::table('escola_escolas')->insert([
                'tenant_id' => $tenantId,
                'nome' => $unidade->nome ?? (string) DB::table('tenants')->where('id', $tenantId)->value('name'),
                'logo_path' => $unidade->logo_path ?? null,
                'ativa' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
