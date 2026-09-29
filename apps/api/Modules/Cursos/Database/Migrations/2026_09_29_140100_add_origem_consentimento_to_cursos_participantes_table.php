<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Participante externo (design D6/D10): `origem` distingue quem entrou pelo cadastro público
 * (`externo`) de quem já era servidor com login (`servidor`, o valor de todo participante
 * existente antes desta mudança). `consentimento_em`/`termo_versao` registram o aceite do termo
 * exigido no cadastro externo — ficam nulos para participantes que nunca passaram por ele.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cursos_participantes', function (Blueprint $table): void {
            // O default cobre as linhas existentes: todo participante de antes desta mudança é servidor.
            $table->string('origem', 20)->default('servidor')->after('documento');
            $table->timestamp('consentimento_em')->nullable()->after('origem');
            $table->string('termo_versao', 20)->nullable()->after('consentimento_em');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->dropColumn(['origem', 'consentimento_em', 'termo_versao']);
        });
    }
};
