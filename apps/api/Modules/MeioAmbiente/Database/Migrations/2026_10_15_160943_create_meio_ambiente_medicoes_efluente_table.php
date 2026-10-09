<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_medicoes_efluente', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('parametro_qualidade_efluente_id')->constrained('meio_ambiente_parametros_qualidade_efluente', 'id', 'ma_medicoes_efluente_parametro_qualidade_efluente_fk')->cascadeOnDelete();
            $table->decimal('valor', 10, 3);
            $table->date('medida_em');
            $table->boolean('conforme');
            $table->timestamps();

            $table->index(['tenant_id', 'parametro_qualidade_efluente_id'], 'ma_medicoes_efluente_parametro_qualidade_efluente_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_medicoes_efluente');
    }
};
