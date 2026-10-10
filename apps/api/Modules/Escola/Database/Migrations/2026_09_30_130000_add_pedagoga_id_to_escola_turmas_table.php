<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Pedagoga responsável pela turma, escolhida na equipe cadastrada (escola_equipe, cargo pedagoga). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('escola_turmas', function (Blueprint $table): void {
            $table->foreignId('pedagoga_id')->nullable()->after('turno_id')->constrained('escola_equipe')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('escola_turmas', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('pedagoga_id');
        });
    }
};
