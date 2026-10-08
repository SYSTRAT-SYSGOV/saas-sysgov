<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tarefa 14.1 (LGPD): `dados_autuado` passa a ser criptografado em repouso (cast
 * `encrypted:array` no model `Documento` — contém o CPF do autuado). Uma coluna `json`
 * nativa do MySQL rejeita a gravação, já que o valor passa a ser uma string cifrada
 * opaca, não mais um JSON válido — por isso a coluna muda pra `text` antes da troca de
 * cast (mesmo padrão já usado em `Modules\Cemiterios\Models\Falecido::$docs_medicos`).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vistoria_documentos', function (Blueprint $table): void {
            $table->text('dados_autuado')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('vistoria_documentos', function (Blueprint $table): void {
            $table->json('dados_autuado')->nullable()->change();
        });
    }
};
