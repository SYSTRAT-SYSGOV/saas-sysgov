<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_autos_infracao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('documento_id')->constrained('vistoria_documentos')->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained('meio_ambiente_empreendimentos')->cascadeOnDelete();
            $table->string('tipo_infracao', 30);
            $table->decimal('area_afetada_ha', 10, 2)->nullable();
            $table->boolean('reincidente')->default(false);
            $table->unsignedBigInteger('valor_multa_sugerido_centavos')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'documento_id']);
            $table->index(['tenant_id', 'empreendimento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_autos_infracao');
    }
};
