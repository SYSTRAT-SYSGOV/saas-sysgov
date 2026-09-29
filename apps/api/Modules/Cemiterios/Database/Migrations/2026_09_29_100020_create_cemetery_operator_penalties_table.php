<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_operator_penalties', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('operator_id')->constrained('cemetery_operators')->cascadeOnDelete();
            $table->string('tipo', 20); // advertencia | suspensao | descredenciamento
            $table->date('inicio');
            $table->date('fim')->nullable();
            $table->text('motivo');
            $table->string('arquivo')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'operator_id', 'fim'], 'cop_tenant_operator_fim_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_operator_penalties');
    }
};
