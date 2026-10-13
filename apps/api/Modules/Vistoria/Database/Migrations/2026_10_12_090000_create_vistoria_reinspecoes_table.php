<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_reinspecoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('documento_id')->constrained('vistoria_documentos')->cascadeOnDelete();
            $table->foreignId('ordem_servico_original_id')->constrained('vistoria_ordens_servico')->cascadeOnDelete();
            $table->foreignId('ordem_servico_reinspecao_id')->nullable()->constrained('vistoria_ordens_servico')->nullOnDelete();
            $table->string('status', 20); // pendente, regularizado, nao_regularizado
            $table->date('data_limite')->comment('Espelha o prazo_limite do documento no momento do agendamento');
            $table->timestamp('constatada_em')->nullable();
            $table->text('observacao')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'documento_id'], 'vistoria_reinspecao_documento_unq');
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_reinspecoes');
    }
};
