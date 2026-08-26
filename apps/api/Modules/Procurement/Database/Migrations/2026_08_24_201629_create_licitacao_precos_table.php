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
        Schema::create('licitacao_precos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('licitacao_id')->constrained('licitacoes')->cascadeOnDelete();
            $table->string('tipo_fonte'); // banco_precos, pncp, contratacao_similar, cotacao
            $table->string('fornecedor');
            $table->unsignedBigInteger('valor_cents');
            $table->string('url_ref')->nullable();
            $table->string('status')->default('valida'); // valida, outlier
            $table->string('motivo_outlier')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'licitacao_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licitacao_precos');
    }
};
