<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Estrutura da unidade escolar: configuração da unidade, turnos e turmas.
 * Unicidade de turma (nome × turno × ano) é validada na aplicação por causa do soft delete (design D4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escola_unidades', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->string('logo_path')->nullable();
            $table->timestamps();
        });

        Schema::create('escola_turnos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 60);
            $table->unsignedTinyInteger('ordem')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ordem']);
        });

        Schema::create('escola_turmas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('turno_id')->constrained('escola_turnos')->restrictOnDelete();
            $table->string('nome', 100);
            $table->unsignedSmallInteger('ano_letivo');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ano_letivo', 'turno_id']);
            $table->index(['tenant_id', 'nome']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escola_turmas');
        Schema::dropIfExists('escola_turnos');
        Schema::dropIfExists('escola_unidades');
    }
};
