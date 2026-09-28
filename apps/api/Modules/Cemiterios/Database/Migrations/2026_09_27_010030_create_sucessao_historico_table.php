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
        Schema::create('sucessao_historico', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sucessao_id')->constrained('sucessoes')->cascadeOnDelete();
            $table->string('de_estado', 30);
            $table->string('para_estado', 30);
            $table->json('motivo')->nullable(); // JSON com parecer, documentos_pendentes, observacoes
            $table->foreignId('usuario_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            // Índices compostos para multi-tenant
            $table->index(['tenant_id', 'sucessao_id', 'created_at'], 'sucessao_historico_tenant_sucessao_created_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sucessao_historico');
    }
};