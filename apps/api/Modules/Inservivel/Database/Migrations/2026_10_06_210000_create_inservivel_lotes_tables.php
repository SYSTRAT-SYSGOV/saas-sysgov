<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Lotes, bens do lote e documentos do lote (D4, D5, D12). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inservivel_lotes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('numero', 30);
            $table->text('descricao');
            $table->date('data_criacao');
            $table->string('responsavel');
            $table->dateTime('data_sorteio_prevista')->nullable();
            $table->string('status', 20)->default('aberto');
            $table->text('observacoes')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'numero']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'criado_por']);
        });

        Schema::create('inservivel_lote_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('inservivel_lotes')->cascadeOnDelete();
            $table->foreignId('bem_id')->constrained('inservivel_bens');
            $table->timestamps();
            $table->unique(['lote_id', 'bem_id']);
            $table->index(['tenant_id', 'bem_id']);
        });

        Schema::create('inservivel_lote_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('inservivel_lotes')->cascadeOnDelete();
            $table->string('nome');
            $table->string('caminho');
            $table->string('mime', 60);
            $table->boolean('gerado_pelo_sistema')->default(false);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['tenant_id', 'lote_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inservivel_lote_documentos');
        Schema::dropIfExists('inservivel_lote_bens');
        Schema::dropIfExists('inservivel_lotes');
    }
};
