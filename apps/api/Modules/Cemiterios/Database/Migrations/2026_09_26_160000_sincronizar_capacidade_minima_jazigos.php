<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Sincroniza a capacidade nominal para ser no mínimo igual à ocupação real existente,
        // eliminando anomalias legadas onde túmulos com múltiplos sepultados constavam com capacidade=1.
        DB::statement('UPDATE plot_inventory SET capacidade = ocupacao WHERE ocupacao > capacidade');
    }

    public function down(): void
    {
        // Sem rollback destrutivo necessário
    }
};
