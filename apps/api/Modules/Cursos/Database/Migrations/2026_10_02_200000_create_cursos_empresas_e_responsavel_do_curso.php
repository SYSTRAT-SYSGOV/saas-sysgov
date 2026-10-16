<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Variáveis do texto no formato do sistema de referência (D10): biblioteca de empresas do órgão,
 * empresa do participante ({EMPRESA}/{CNPJ}) e responsável do curso ({RESPONSAVEL}). Empresa em
 * uso por participante não é excluída — desative-a.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_empresas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('razao_social', 150);
            $table->string('nome_fantasia', 150)->nullable();
            $table->string('cnpj', 14)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('responsavel', 150)->nullable();
            $table->string('observacoes', 255)->nullable();
            $table->boolean('ativa')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'cnpj']);
            $table->index(['tenant_id', 'ativa']);
        });

        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->foreignId('empresa_id')->nullable()->after('pessoa_id')->constrained('cursos_empresas')->restrictOnDelete();
        });

        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->string('responsavel', 150)->nullable()->after('conteudo_programatico');
        });
    }

    public function down(): void
    {
        Schema::table('cursos_cursos', function (Blueprint $table): void {
            $table->dropColumn('responsavel');
        });
        Schema::table('cursos_participantes', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('empresa_id');
        });
        Schema::dropIfExists('cursos_empresas');
    }
};
