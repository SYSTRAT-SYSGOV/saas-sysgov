<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_destinacoes_compensacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('compensacao_ambiental_id')->constrained('meio_ambiente_compensacoes_ambientais')->cascadeOnDelete();
            $table->string('destino', 30);
            $table->unsignedBigInteger('valor_centavos');
            $table->timestamp('registrada_em');
            $table->timestamps();

            $table->index(['tenant_id', 'compensacao_ambiental_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_destinacoes_compensacao');
    }
};
