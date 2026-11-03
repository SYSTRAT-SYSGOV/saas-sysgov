<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_rota_percursos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('rota_id')->constrained('transporte_rotas')->cascadeOnDelete();
            $table->json('coordenadas');
            $table->unsignedInteger('pontos');
            $table->decimal('km', 8, 2);
            $table->foreignId('importado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('importado_em');
            $table->timestamps();
            $table->unique('rota_id', 'tr_rota_percurso_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporte_rota_percursos');
    }
};
