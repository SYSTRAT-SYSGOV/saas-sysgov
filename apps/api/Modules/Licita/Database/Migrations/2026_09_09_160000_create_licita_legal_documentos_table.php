<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_legal_documentos', function (Blueprint $table): void {
            $table->id();
            // NULL = documento global, mantido pela SYSTRAT e visível a todos os
            // tenants (ex.: a própria Lei 14.133/2021). Por isso este model NÃO
            // usa o trait TenantAware — a regra de escopo é própria (ver model).
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo');
            $table->string('numero')->nullable();
            $table->string('titulo', 500);
            $table->text('ementa')->nullable();
            $table->longText('texto_completo');
            $table->json('tags')->nullable();
            $table->boolean('ativo')->default(true);
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'tipo', 'ativo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_legal_documentos');
    }
};
