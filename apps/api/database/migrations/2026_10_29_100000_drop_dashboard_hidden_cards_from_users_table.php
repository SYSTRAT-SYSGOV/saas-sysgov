<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A home do Cliente voltou a ter cards fixos (openspec simplificar-home-cliente): não há mais o que o usuário
 * escolher mostrar ou ocultar, então a coluna criada em 2026_10_28_100000 sai.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('users', 'dashboard_hidden_cards')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->dropColumn('dashboard_hidden_cards');
            });
        }
    }

    public function down(): void
    {
        if (!Schema::hasColumn('users', 'dashboard_hidden_cards')) {
            Schema::table('users', function (Blueprint $table): void {
                $table->json('dashboard_hidden_cards')->nullable();
            });
        }
    }
};
