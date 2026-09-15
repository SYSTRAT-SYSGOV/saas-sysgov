<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_aprovacoes_finais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            $table->string('status')->default('pendente');
            $table->foreignId('solicitado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('solicitado_em')->nullable();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->text('parecer')->nullable();
            $table->text('motivo_rejeicao')->nullable();
            $table->timestamps();

            // Uma linha por processo — cada nova solicitação (inclusive após
            // rejeição) atualiza a mesma linha em vez de criar outra; o
            // histórico de rejeições fica no AuditLogger, não aqui.
            $table->unique(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_aprovacoes_finais');
    }
};
