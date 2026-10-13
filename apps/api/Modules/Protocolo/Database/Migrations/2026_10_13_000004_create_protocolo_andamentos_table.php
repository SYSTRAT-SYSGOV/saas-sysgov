<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocolo_andamentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('protocolo_processos')->restrictOnDelete();
            $table->foreignId('orgao_origem_id')->constrained('org_units')->cascadeOnDelete();
            $table->foreignId('orgao_destino_id')->constrained('org_units')->cascadeOnDelete();
            $table->foreignId('tipo_tramitacao_id')->constrained('protocolo_tipos_tramitacao')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('usuario_recebedor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('descricao')->nullable();
            $table->dateTime('data_recebimento')->nullable();
            $table->dateTime('data_envio')->nullable();
            $table->boolean('and_atual')->default(true);
            $table->unsignedInteger('sequencia');
            $table->unsignedBigInteger('and_atual_chave')->storedAs('CASE WHEN and_atual = 1 THEN processo_id ELSE NULL END')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'processo_id', 'sequencia']);
            $table->unique(['tenant_id', 'and_atual_chave']);
            $table->index(['tenant_id', 'processo_id', 'and_atual']);
            $table->index(['tenant_id', 'orgao_destino_id', 'and_atual']);
            $table->index(['tenant_id', 'usuario_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_andamentos');
    }
};
