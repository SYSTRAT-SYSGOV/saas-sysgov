<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Um só número de convidados (design D16): os "incluídos" passam a contar como convidados.
 * Migração só de dados; em formaturas "fixo + convidados" o devido de quem tinha incluídos aumenta (intencional).
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('formatura_participacoes')->where('convidados_incluidos', '>', 0)->update([
            'convidados_extras' => DB::raw('convidados_extras + convidados_incluidos'),
            'convidados_incluidos' => 0,
        ]);
        DB::table('formatura_configuracoes')->update(['convidados_incluidos_padrao' => 0]);
    }

    public function down(): void
    {
        // Irreversível sem perda: não se sabe quantos dos convidados eram "incluídos".
    }
};
