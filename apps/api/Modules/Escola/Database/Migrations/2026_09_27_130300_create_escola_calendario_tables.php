<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Trimestres letivos e categorias de ocorrência (unicidade validada na aplicação, design D4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escola_trimestres', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->unsignedTinyInteger('numero');
            $table->date('data_inicio');
            $table->date('data_fim');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ano_letivo', 'numero']);
        });

        Schema::create('escola_categorias_ocorrencia', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('nome_normalizado', 100);
            $table->char('cor', 7);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'nome_normalizado']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escola_categorias_ocorrencia');
        Schema::dropIfExists('escola_trimestres');
    }
};
