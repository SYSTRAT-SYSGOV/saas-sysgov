<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RF-06 (art. 25): Avaliação pelo Usuário Externo — composição do Fator H.
 * Segregada da avaliação funcional interna (Avaliacao/DiarioBordo).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_avaliacoes_usuario', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('servidor_id');
            $table->unsignedBigInteger('ciclo_id');
            $table->decimal('nota_atendimento', 5, 2);
            $table->text('comentario')->nullable();
            // Identificador opcional do avaliador externo (ex.: hash de CPF); pode ficar anônimo.
            $table->string('avaliador_identificador', 100)->nullable();
            $table->timestamps();

            $table->foreign('ciclo_id')
                ->references('id')
                ->on('capd_ciclos')
                ->restrictOnDelete();

            $table->index(['tenant_id', 'servidor_id', 'ciclo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_avaliacoes_usuario');
    }
};
