<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Modelos de exportação do Censo (change transporte-fase-4-censo-e-painel, D35): seleção de campos salva por tenant. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_modelos_exportacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('leiaute', 40);
            $table->json('campos');
            $table->boolean('padrao')->default(false);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'nome'], 'tr_modelos_t_nome_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporte_modelos_exportacao');
    }
};
