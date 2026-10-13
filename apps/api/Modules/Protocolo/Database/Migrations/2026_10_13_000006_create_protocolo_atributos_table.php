<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocolo_atributos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('protocolo_processos')->cascadeOnDelete();
            $table->string('chave', 100);
            $table->json('valor');
            $table->string('tipo_atributo', 32);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'processo_id', 'chave']);
            $table->index(['tenant_id', 'tipo_atributo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_atributos');
    }
};
