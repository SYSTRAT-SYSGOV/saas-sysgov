<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_parcelamentos_multa', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_sancionatorio_id')->constrained('vistoria_processos_sancionatorios', 'id', 'ma_parcelamentos_multa_processo_sancionatorio_fk')->cascadeOnDelete();
            $table->unsignedTinyInteger('numero_parcelas');
            $table->unsignedBigInteger('valor_total_centavos');
            $table->timestamps();

            $table->unique(['tenant_id', 'processo_sancionatorio_id'], 'ma_parcelamentos_multa_processo_sancionatorio_unq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_parcelamentos_multa');
    }
};
