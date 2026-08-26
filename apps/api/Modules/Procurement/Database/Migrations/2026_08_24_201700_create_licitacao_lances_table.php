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
        Schema::create('licitacao_lances', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('licitacao_id')->constrained('licitacoes')->cascadeOnDelete();
            $table->foreignId('participante_id')->constrained('licitacao_participantes')->cascadeOnDelete();
            $table->unsignedBigInteger('valor_cents');
            $table->integer('ordem');
            $table->timestamp('lancado_em');
            $table->timestamps();

            $table->index(['tenant_id', 'licitacao_id', 'ordem']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licitacao_lances');
    }
};
