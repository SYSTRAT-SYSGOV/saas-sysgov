<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_coletas_residuo', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('gerador_residuo_id')->constrained('meio_ambiente_geradores_residuo')->cascadeOnDelete();
            $table->string('tipo_coleta', 15);
            $table->string('rota')->nullable();
            $table->decimal('volume_kg', 10, 2);
            $table->string('destinacao', 15);
            $table->date('coletada_em');
            $table->timestamps();

            $table->index(['tenant_id', 'gerador_residuo_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_coletas_residuo');
    }
};
