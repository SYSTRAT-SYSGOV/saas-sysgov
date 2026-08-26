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
        Schema::create('contratos_licitacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('licitacao_id')->nullable()->constrained('licitacoes');
            $table->string('numero');
            $table->foreignId('fornecedor_id')->constrained('licitacao_participantes');
            $table->unsignedBigInteger('valor_inicial_cents');
            $table->date('vigencia_inicio');
            $table->date('vigencia_fim');
            $table->string('garantia')->nullable();
            $table->foreignId('gestor_id')->nullable()->constrained('users');
            $table->foreignId('fiscal_id')->nullable()->constrained('users');
            $table->string('status')->default('vigente');
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contratos_licitacao');
    }
};
