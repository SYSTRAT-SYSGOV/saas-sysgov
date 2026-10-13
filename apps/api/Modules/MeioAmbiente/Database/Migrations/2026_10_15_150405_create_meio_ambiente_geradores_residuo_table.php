<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_geradores_residuo', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome')->nullable();
            $table->string('tipo', 15);
            $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->foreignId('empreendimento_id')->nullable()->constrained('meio_ambiente_empreendimentos')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'empreendimento_id'], 'ma_geradores_residuo_empreendimento_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_geradores_residuo');
    }
};
