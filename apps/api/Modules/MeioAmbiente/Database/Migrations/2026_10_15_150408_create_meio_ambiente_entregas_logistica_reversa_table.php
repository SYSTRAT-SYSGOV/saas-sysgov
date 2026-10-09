<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_entregas_logistica_reversa', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ponto_logistica_reversa_id')->constrained('meio_ambiente_pontos_logistica_reversa', 'id', 'ma_entregas_logistica_reversa_ponto_logistica_reversa_fk')->cascadeOnDelete();
            $table->decimal('quantidade_kg', 10, 2);
            $table->date('entregue_em');
            $table->timestamps();

            $table->index(['tenant_id', 'ponto_logistica_reversa_id'], 'ma_entregas_logistica_reversa_ponto_logistica_reversa_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_entregas_logistica_reversa');
    }
};
