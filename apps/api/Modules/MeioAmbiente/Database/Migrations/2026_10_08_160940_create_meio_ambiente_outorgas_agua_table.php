<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_outorgas_agua', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained('meio_ambiente_empreendimentos')->cascadeOnDelete();
            $table->string('tipo_captacao', 20);
            $table->decimal('vazao_m3_hora', 10, 2);
            $table->string('finalidade', 20);
            $table->date('validade_em');
            $table->timestamps();

            $table->index(['tenant_id', 'empreendimento_id']);
            $table->index(['tenant_id', 'validade_em']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_outorgas_agua');
    }
};
