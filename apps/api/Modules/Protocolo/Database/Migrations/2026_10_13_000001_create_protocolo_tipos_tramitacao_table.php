<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocolo_tipos_tramitacao', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('slug', 64);
            $table->string('nome', 120);
            $table->string('descricao', 255)->nullable();
            $table->boolean('ativo')->default(true);
            $table->unsignedSmallInteger('prazo_dias')->nullable();
            $table->string('efeito_status', 32)->nullable();
            $table->softDeletes();
            $table->timestamps();

            $table->unique(['tenant_id', 'slug']);
            $table->index(['tenant_id', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_tipos_tramitacao');
    }
};
