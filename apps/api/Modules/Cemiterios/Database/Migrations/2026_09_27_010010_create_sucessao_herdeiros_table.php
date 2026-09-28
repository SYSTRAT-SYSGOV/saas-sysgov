<?php

declare(strict_types=1);

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
        Schema::create('sucessao_herdeiros', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucessao_id')->constrained('sucessoes')->cascadeOnDelete();
            $table->string('nome', 255);
            $table->string('parentesco', 30); // companheiro | filho | pai | mae | irmao | neto | avo | tio | sobrinho | outro | representante
            $table->string('documento', 50)->nullable();
            $table->integer('ordem')->default(0);
            $table->boolean('direito_representacao')->default(false);
            $table->boolean('titular_indicado')->default(false);
            $table->foreignId('herdeiro_representado_id')->nullable()->constrained('sucessao_herdeiros')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            // Índices compostos para multi-tenant
            $table->index(['tenant_id', 'sucessao_id', 'ordem'], 'sucessao_herdeiros_tenant_sucessao_ordem_idx');
            $table->index(['tenant_id', 'sucessao_id', 'titular_indicado'], 'sucessao_herdeiros_tenant_sucessao_titular_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sucessao_herdeiros');
    }
};