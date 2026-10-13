<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/** Placa e motorista do veículo passam a ser opcionais (muitas vezes só se sabem no dia do passeio). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('passeio_veiculos', function (Blueprint $table): void {
            $table->string('placa', 10)->nullable()->change();
            $table->string('motorista', 200)->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('passeio_veiculos')->whereNull('placa')->update(['placa' => '']);
        DB::table('passeio_veiculos')->whereNull('motorista')->update(['motorista' => '']);
        Schema::table('passeio_veiculos', function (Blueprint $table): void {
            $table->string('placa', 10)->nullable(false)->change();
            $table->string('motorista', 200)->nullable(false)->change();
        });
    }
};
