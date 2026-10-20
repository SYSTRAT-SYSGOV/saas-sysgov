<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * inservivel_entidades ligada ao Cadastro de Pessoas (unificar-pessoas-fase-4-inservivel-passeio-procurement). Nullable até a
 * conciliação dos registros existentes; as colunas próprias continuam como cópia até a Fase 5.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('inservivel_entidades', function (Blueprint $table): void {
            $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('inservivel_entidades', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('pessoa_id');
        });
    }
};
