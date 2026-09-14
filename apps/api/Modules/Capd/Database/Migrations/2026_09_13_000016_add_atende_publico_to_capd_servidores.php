<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RF-06: indica se o cargo do servidor tem atendimento direto ao público —
 * usado para decidir a redistribuição do peso do Fator H (art. 25).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->boolean('atende_publico')->default(true)->after('cargo_efetivo');
        });
    }

    public function down(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropColumn('atende_publico');
        });
    }
};
