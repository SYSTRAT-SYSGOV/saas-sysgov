<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_operator_licenses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('operator_id')->constrained('cemetery_operators')->cascadeOnDelete();
            $table->string('numero', 50);
            $table->date('validade');
            $table->string('arquivo')->nullable();
            $table->string('hash', 64)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'operator_id', 'validade'], 'col_tenant_operator_validade_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_operator_licenses');
    }
};
