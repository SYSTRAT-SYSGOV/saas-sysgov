<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_parcelas_multa', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('parcelamento_id')->constrained('meio_ambiente_parcelamentos_multa')->cascadeOnDelete();
            $table->unsignedTinyInteger('numero');
            $table->unsignedBigInteger('valor_centavos');
            $table->date('vencimento');
            $table->boolean('pago')->default(false);
            $table->timestamp('pago_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'parcelamento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_parcelas_multa');
    }
};
