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
        Schema::create('medicoes_contratuais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('contrato_id')->constrained('contratos_licitacao')->cascadeOnDelete();
            $table->string('numero');
            $table->string('periodo');
            $table->unsignedBigInteger('valor_cents');
            $table->string('status')->default('em_analise');
            $table->json('anexos')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'contrato_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('medicoes_contratuais');
    }
};
