<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocolo_vinculos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('protocolo_processos')->cascadeOnDelete();
            $table->string('entidade_tipo', 64);
            $table->unsignedBigInteger('entidade_id');
            $table->string('papel_vinculo', 32)->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'processo_id', 'entidade_tipo', 'entidade_id', 'papel_vinculo'], 'protocolo_vinculos_unique');
            $table->index(['tenant_id', 'entidade_tipo', 'entidade_id'], 'protocolo_vinculos_entidade_idx');
            $table->index(['tenant_id', 'processo_id'], 'protocolo_vinculos_processo_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_vinculos');
    }
};
