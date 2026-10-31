<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Módulo Transporte, Fase 5 (change transporte-fase-5-carga-e-demonstracao). Cada importação por CSV passa por
 * prévia → confirmação → fila. O arquivo fica guardado só entre a prévia e o fim do processamento; o relatório
 * (sem dados pessoais além do número da linha e do motivo) permanece.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_importacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->string('arquivo_nome', 255);
            $table->string('arquivo_caminho', 255)->nullable();
            $table->string('status', 20);
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('validas')->default(0);
            $table->unsignedInteger('criadas')->default(0);
            $table->unsignedInteger('ignoradas')->default(0);
            $table->unsignedInteger('com_erro')->default(0);
            $table->json('relatorio')->nullable();
            $table->text('mensagem')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('concluida_em')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'tipo', 'status'], 'tr_import_t_tipo_status_ix');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transporte_importacoes');
    }
};
