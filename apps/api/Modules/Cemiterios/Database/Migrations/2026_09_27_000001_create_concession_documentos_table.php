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
        Schema::create('concession_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained();
            $table->foreignId('concession_id')->constrained()->onDelete('cascade');
            $table->enum('tipo', ['termo', 'escritura', 'inventario', 'procuracao', 'outro']);
            $table->string('arquivo'); // caminho no storage
            $table->string('hash', 64); // SHA-256 para verificação de integridade
            $table->timestamps();

            // Índices para melhor performance em consultas
            $table->index(['tenant_id', 'concession_id']);
            $table->index(['tipo']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('concession_documentos');
    }
};