<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cursos_aulas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('curso_id')->constrained('cursos_cursos')->cascadeOnDelete();
            $table->string('titulo');
            $table->text('descricao')->nullable();
            $table->unsignedSmallInteger('ordem')->default(1);
            $table->unsignedInteger('duracao_minutos');
            $table->timestamps();

            $table->index(['tenant_id', 'curso_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cursos_aulas');
    }
};
