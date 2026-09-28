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
        Schema::create('concession_herdeiros', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained();
            $table->foreignId('concession_id')->constrained()->onDelete('cascade');
            $table->string('nome', 255);
            $table->string('parentesco', 100);
            $table->string('documento', 50)->nullable();
            $table->boolean('titular_indicado')->default(false);
            $table->integer('ordem')->default(0);
            $table->timestamps();

            // Índices para melhor performance em consultas
            $table->index(['tenant_id', 'concession_id']);
            $table->index(['titular_indicado']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('concession_herdeiros');
    }
};