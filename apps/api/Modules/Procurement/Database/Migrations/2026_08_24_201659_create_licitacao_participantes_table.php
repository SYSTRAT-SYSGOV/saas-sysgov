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
        Schema::create('licitacao_participantes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('licitacao_id')->constrained('licitacoes')->cascadeOnDelete();
            $table->string('razao_social');
            $table->string('cnpj', 14);
            $table->string('status')->default('convidado');
            $table->timestamps();

            $table->unique(['tenant_id', 'licitacao_id', 'cnpj']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licitacao_participantes');
    }
};
