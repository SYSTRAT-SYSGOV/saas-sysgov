<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Construtor por curso (D8): bibliotecas de fundos e de modelos de texto, e o vínculo do modelo
 * visual com o curso, o fundo e o texto escolhidos. Sem soft delete: a exclusão é recusada
 * enquanto algum leiaute usar o item; o caminho de saída é desativá-lo.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_fundos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('descricao', 255)->nullable();
            $table->string('imagem_path');
            $table->string('orientacao', 10)->default('paisagem');
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ativo']);
        });

        Schema::create('cursos_textos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->string('tipo_certificado', 150)->nullable();
            $table->text('texto_principal');
            $table->text('texto_complementar')->nullable();
            $table->string('observacoes', 255)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'ativo']);
        });

        Schema::table('cursos_modelos_certificado', function (Blueprint $table): void {
            $table->foreignId('curso_id')->nullable()->after('tenant_id')->constrained('cursos_cursos')->cascadeOnDelete();
            $table->foreignId('fundo_id')->nullable()->after('fundo_path')->constrained('cursos_fundos')->restrictOnDelete();
            $table->foreignId('texto_id')->nullable()->after('corpo')->constrained('cursos_textos')->restrictOnDelete();

            $table->unique(['tenant_id', 'curso_id']);
        });
    }

    public function down(): void
    {
        Schema::table('cursos_modelos_certificado', function (Blueprint $table): void {
            $table->dropUnique(['tenant_id', 'curso_id']);
            $table->dropConstrainedForeignId('texto_id');
            $table->dropConstrainedForeignId('fundo_id');
            $table->dropConstrainedForeignId('curso_id');
        });
        Schema::dropIfExists('cursos_textos');
        Schema::dropIfExists('cursos_fundos');
    }
};
