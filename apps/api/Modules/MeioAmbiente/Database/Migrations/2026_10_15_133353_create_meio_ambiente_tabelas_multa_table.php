<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_tabelas_multa', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo_infracao', 30);
            $table->string('criterio', 15);
            $table->unsignedBigInteger('valor_base_centavos');
            $table->unsignedSmallInteger('agravante_reincidencia_percentual')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'tipo_infracao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_tabelas_multa');
    }
};
