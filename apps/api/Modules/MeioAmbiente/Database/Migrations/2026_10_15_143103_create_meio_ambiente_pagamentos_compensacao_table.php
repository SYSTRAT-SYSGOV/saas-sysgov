<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_pagamentos_compensacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('compensacao_ambiental_id')->constrained('meio_ambiente_compensacoes_ambientais', 'id', 'ma_pagamentos_compensacao_compensacao_ambiental_fk')->cascadeOnDelete();
            $table->unsignedBigInteger('valor_centavos');
            $table->date('pago_em');
            $table->string('comprovante')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'compensacao_ambiental_id'], 'ma_pagamentos_compensacao_compensacao_ambiental_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_pagamentos_compensacao');
    }
};
