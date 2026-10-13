<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Livro-caixa da campanha com os campos da prestação de contas do TSE (Fase 2B, D4). Valor em centavos; CPF/CNPJ
 * criptografado (text) com HMAC para busca exata; comprovante no disco privado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_lancamentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->string('tipo', 10);
            $table->string('categoria', 40);
            $table->unsignedBigInteger('valor_centavos');
            $table->date('data');
            $table->string('forma_pagamento', 20);
            $table->unsignedInteger('codigo_ibge')->nullable();
            $table->string('contraparte_nome', 200)->nullable();
            $table->text('contraparte_documento')->nullable();
            $table->char('contraparte_documento_hash', 64)->nullable();
            $table->string('origem_recurso', 30)->nullable();
            $table->string('recibo_eleitoral', 60)->nullable();
            $table->string('documento_fiscal_tipo', 20)->nullable();
            $table->string('documento_fiscal_numero', 60)->nullable();
            $table->foreignId('material_id')->nullable()->constrained('campanha_materiais')->nullOnDelete();
            $table->string('comprovante', 255)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'tipo', 'data']);
            $table->index(['tenant_id', 'campanha_id', 'categoria']);
            $table->index(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'contraparte_documento_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_lancamentos');
    }
};
