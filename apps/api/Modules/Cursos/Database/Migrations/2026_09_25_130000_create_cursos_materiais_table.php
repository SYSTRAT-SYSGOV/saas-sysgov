<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_materiais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            // Aula excluída não apaga o material: a regra "no início da aula" passa a aguardar agendamento.
            $table->foreignId('aula_id')->nullable()->constrained('cursos_aulas')->nullOnDelete();
            $table->string('tipo', 20);
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->boolean('publicado')->default(false);
            $table->longText('conteudo')->nullable();
            $table->string('url', 2048)->nullable();
            $table->string('video_provedor', 20)->nullable();
            $table->string('video_id', 40)->nullable();
            $table->string('arquivo_path')->nullable();
            $table->string('arquivo_nome')->nullable();
            $table->unsignedBigInteger('arquivo_tamanho')->nullable();
            $table->string('liberacao_regra', 20)->default('imediata');
            $table->unsignedSmallInteger('liberacao_dias')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'curso_id', 'ordem']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_materiais');
    }
};
