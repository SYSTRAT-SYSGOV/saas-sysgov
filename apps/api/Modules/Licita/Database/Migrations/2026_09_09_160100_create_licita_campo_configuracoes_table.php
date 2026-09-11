<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_campo_configuracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            // Usa os mesmos valores do enum FaseLicita (dfd|etp|mapa_riscos|
            // pesquisa_precos|tr|edital) — não há enum próprio para isso.
            $table->string('tipo_documento');
            $table->json('campos');
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->unique(['tenant_id', 'tipo_documento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_campo_configuracoes');
    }
};
