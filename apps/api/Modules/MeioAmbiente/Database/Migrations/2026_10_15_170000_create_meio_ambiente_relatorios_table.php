<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_relatorios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo', 10);
            $table->unsignedSmallInteger('exercicio');
            $table->json('dados');
            $table->foreignId('gerado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'tipo', 'exercicio'], 'ma_relatorios_tipo_exercicio_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_relatorios');
    }
};
