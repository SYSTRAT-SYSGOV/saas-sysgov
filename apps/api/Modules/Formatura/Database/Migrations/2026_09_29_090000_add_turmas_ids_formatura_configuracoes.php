<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Turmas formandas da configuração (design D10): só alunos dessas turmas são formandos. Aditiva. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formatura_configuracoes', function (Blueprint $table): void {
            $table->json('turmas_ids')->nullable()->after('formas_pagamento');
        });
    }

    public function down(): void
    {
        Schema::table('formatura_configuracoes', function (Blueprint $table): void {
            $table->dropColumn('turmas_ids');
        });
    }
};
