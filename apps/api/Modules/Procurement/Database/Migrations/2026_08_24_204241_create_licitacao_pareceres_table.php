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
        Schema::create('licitacao_pareceres', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('licitacao_id')->constrained('licitacoes')->cascadeOnDelete();
            $table->foreignId('parecerista_id')->constrained('users');
            $table->foreignId('aprovado_por')->nullable()->constrained('users');
            $table->string('tipo'); // juridico, controle_interno
            $table->text('parecer');
            $table->string('status')->default('rascunho');
            $table->timestamps();

            $table->index(['tenant_id', 'licitacao_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licitacao_pareceres');
    }
};
