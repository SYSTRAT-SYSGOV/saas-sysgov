<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RN-02/RN-04/RN-05: Consolidação Trienal (NFC) persistida e versionada.
 *
 * Cada processamento cria uma NOVA versão para o par (servidor, triênio) —
 * o registro nunca é atualizado/apagado, preservando o histórico auditável.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_consolidacoes', function (Blueprint $table): void {
            $table->id();
            $table->unsignedBigInteger('tenant_id')->index();
            $table->unsignedBigInteger('servidor_id');
            // Ciclo (última etapa da cadência) que disparou o processamento
            $table->unsignedBigInteger('ciclo_id');
            // Ano inicial do triênio (ex.: 2024 para cadência 2024-2025-2026)
            $table->unsignedSmallInteger('trienio');
            // Snapshot das notas de ciclo usadas no cálculo — {"2024": "80.00", ...}
            $table->json('notas_ciclos');
            $table->decimal('nfc', 5, 2);
            $table->string('conceito', 30);
            $table->boolean('elegivel_progressao');
            // Snapshot dos parâmetros vigentes no momento do cálculo (nota_corte_nfc, faixas_conceito)
            $table->json('parametros');
            $table->unsignedInteger('versao')->default(1);
            $table->timestamps();

            $table->foreign('ciclo_id')
                ->references('id')
                ->on('capd_ciclos')
                ->restrictOnDelete();

            $table->unique(['tenant_id', 'servidor_id', 'trienio', 'versao']);
            $table->index(['tenant_id', 'trienio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_consolidacoes');
    }
};
