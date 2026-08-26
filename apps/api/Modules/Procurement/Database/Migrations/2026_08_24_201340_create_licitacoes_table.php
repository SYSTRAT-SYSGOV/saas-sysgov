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
        Schema::create('licitacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->nullable()->constrained('org_units');
            $table->foreignId('created_by')->nullable()->constrained('users');
            $table->foreignId('homologador_id')->nullable()->constrained('users');
            $table->string('numero'); // ex.: 12/2026
            $table->string('modalidade');
            $table->text('objeto');
            $table->string('criterio_julgamento');
            $table->string('regime_execucao');
            $table->unsignedBigInteger('valor_estimado_cents')->default(0);
            $table->string('status')->default('rascunho');
            $table->json('fase_interna')->nullable();
            $table->dateTime('data_abertura')->nullable();
            $table->string('fundamento_legal')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'modalidade']);
            $table->unique(['tenant_id', 'numero']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('licitacoes');
    }
};
