<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('concession_historico')) {
            Schema::create('concession_historico', function (Blueprint $table) {
                $table->id();
                $table->foreignId('tenant_id')->constrained();
                $table->foreignId('concession_id')->constrained()->onDelete('cascade');
                $table->string('de_estado', 20);
                $table->string('para_estado', 20);
                $table->string('motivo', 255);
                // nullable: ações disparadas por comando agendado não têm usuário autenticado.
                $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('processo_referencia', 50)->nullable();
                $table->timestamps();

                // Índices para melhor performance em consultas históricas
                $table->index(['tenant_id', 'concession_id']);
                $table->index(['created_at']);
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('concession_historico');
    }
};