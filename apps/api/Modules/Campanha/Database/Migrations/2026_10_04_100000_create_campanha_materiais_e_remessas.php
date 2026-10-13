<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Materiais de campanha e remessas (Fase 2B, D2). Estoque = produzida − soma das remessas (sem coluna de saldo).
 * O valor contábil é o total do lote em centavos; o unitário é derivado.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_materiais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->string('nome', 200);
            $table->string('fornecedor', 200)->nullable();
            $table->string('unidade', 20)->default('unidades');
            $table->unsignedInteger('quantidade_produzida');
            $table->unsignedBigInteger('valor_total_centavos')->default(0);
            $table->decimal('peso_kg', 10, 3)->nullable();
            $table->decimal('volume_m3', 10, 4)->nullable();
            $table->text('observacoes')->nullable();
            $table->string('imagem', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'tipo']);
        });

        Schema::create('campanha_remessas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('campanha_materiais')->cascadeOnDelete();
            $table->unsignedInteger('codigo_ibge');
            $table->foreignId('coordenador_id')->nullable()->constrained('campanha_coordenadores')->nullOnDelete();
            $table->foreignId('cabo_id')->nullable()->constrained('campanha_cabos')->nullOnDelete();
            $table->unsignedInteger('quantidade');
            $table->date('enviada_em');
            $table->string('transportadora', 200)->nullable();
            $table->string('motorista', 200)->nullable();
            $table->string('veiculo', 100)->nullable();
            $table->date('previsao_entrega')->nullable();
            $table->date('entregue_em')->nullable();
            $table->string('recebido_por', 200)->nullable();
            $table->string('foto', 255)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'campanha_id', 'material_id']);
            $table->index(['tenant_id', 'campanha_id', 'codigo_ibge']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_remessas');
        Schema::dropIfExists('campanha_materiais');
    }
};
