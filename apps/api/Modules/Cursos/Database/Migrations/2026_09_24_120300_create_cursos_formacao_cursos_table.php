<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_formacao_cursos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('formacao_id')->constrained('cursos_formacoes')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->boolean('obrigatorio')->default(true);
            $table->timestamps();

            $table->unique(['formacao_id', 'curso_id']);
            $table->index(['tenant_id', 'curso_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_formacao_cursos');
    }
};
