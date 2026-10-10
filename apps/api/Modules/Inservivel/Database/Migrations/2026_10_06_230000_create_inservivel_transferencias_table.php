<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Transferência interna entre secretarias (D11). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inservivel_transferencias', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('bem_id')->constrained('inservivel_bens');
            $table->foreignId('secretaria_origem_unit_id')->constrained('org_units');
            $table->foreignId('secretaria_destino_unit_id')->nullable()->constrained('org_units');
            $table->string('status', 20)->default('anunciado');
            $table->foreignId('situacao_anterior_id')->nullable()->constrained('inservivel_situacoes')->nullOnDelete();
            $table->text('observacao')->nullable();
            $table->text('motivo_recusa')->nullable();
            $table->foreignId('anunciado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('solicitado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('decidido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('data_solicitacao')->nullable();
            $table->dateTime('data_conclusao')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'bem_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inservivel_transferencias');
    }
};
