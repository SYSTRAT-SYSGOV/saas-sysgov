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
        Schema::create('sucessoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('concession_id')->constrained('concessions')->cascadeOnDelete();
            $table->foreignId('park_id')->nullable()->constrained('cemetery_parks')->nullOnDelete();
            $table->foreignId('plot_id')->nullable()->constrained('plot_inventory')->nullOnDelete();
            $table->string('via', 30); // inventario_judicial | inventario_extrajudicial | alvara_judicial | arrolamento
            $table->string('estado', 30)->default('solicitada'); // solicitada | em_analise | aguardando_documentos | validada | sucedida | indeferida | arquivada
            $table->foreignId('requerente_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('titular_falecido_id')->nullable()->constrained('concession_holders')->nullOnDelete();
            $table->date('data_falecimento')->nullable();
            $table->string('processo_referencia', 50)->nullable();
            $table->text('parecer')->nullable();
            $table->integer('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            // Índices compostos para multi-tenant
            $table->index(['tenant_id', 'concession_id'], 'sucessoes_tenant_concession_idx');
            $table->index(['tenant_id', 'estado'], 'sucessoes_tenant_estado_idx');
            $table->index(['tenant_id', 'park_id', 'estado'], 'sucessoes_tenant_park_estado_idx');
            $table->index(['tenant_id', 'via'], 'sucessoes_tenant_via_idx');
            $table->unique(['tenant_id', 'concession_id', 'estado'], 'sucessoes_tenant_concession_estado_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sucessoes');
    }
};