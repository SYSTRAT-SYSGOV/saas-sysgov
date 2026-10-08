<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_parametros_qualidade_efluente', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('licenca_lancamento_efluente_id')->constrained('meio_ambiente_licencas_lancamento_efluente')->cascadeOnDelete();
            $table->string('parametro', 30);
            $table->decimal('limite_min', 10, 3)->nullable();
            $table->decimal('limite_max', 10, 3)->nullable();
            $table->string('unidade', 20)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'licenca_lancamento_efluente_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_parametros_qualidade_efluente');
    }
};
