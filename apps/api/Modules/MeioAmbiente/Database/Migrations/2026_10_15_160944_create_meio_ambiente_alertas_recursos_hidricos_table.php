<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_alertas_recursos_hidricos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo_referencia', 20);
            $table->unsignedBigInteger('referencia_id');
            $table->unsignedSmallInteger('dias_para_vencimento');
            $table->timestamp('gerado_em');
            $table->timestamps();

            $table->unique(['tenant_id', 'tipo_referencia', 'referencia_id', 'dias_para_vencimento'], 'meio_amb_alerta_rh_unico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_alertas_recursos_hidricos');
    }
};
