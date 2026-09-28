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
        Schema::create('sucessao_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucessao_id')->constrained('sucessoes')->cascadeOnDelete();
            $table->string('tipo', 30); // certidao_obito | inventario | formal_partilha | escritura | alvara | procuracao | outro
            $table->string('arquivo', 500); // path no storage
            $table->string('hash', 64); // SHA-256
            $table->softDeletes();
            $table->timestamps();

            // Índices compostos para multi-tenant
            $table->index(['tenant_id', 'sucessao_id', 'tipo'], 'sucessao_documentos_tenant_sucessao_tipo_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sucessao_documentos');
    }
};