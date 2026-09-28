<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_price_items', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('servico', 40);
            $table->unsignedBigInteger('valor_centavos');
            $table->date('vigencia_inicio');
            $table->date('vigencia_fim')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'servico', 'vigencia_inicio']);
        });

        Schema::create('cemetery_price_adjustments', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('indice', 10);
            $table->unsignedSmallInteger('competencia'); // ano de vigência do reajuste
            $table->decimal('percentual', 7, 4);
            $table->string('origem', 12); // automatica | manual
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'competencia']);
        });

        Schema::create('cemetery_charges', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('numero', 20);
            $table->string('origem_type', 20)->nullable();
            $table->unsignedBigInteger('origem_id')->nullable();
            $table->foreignId('holder_id')->nullable()->constrained('concession_holders')->nullOnDelete();
            $table->string('contribuinte_nome');
            $table->string('servico', 40);
            $table->unsignedSmallInteger('exercicio')->nullable();
            $table->unsignedBigInteger('valor_centavos');
            $table->date('vencimento');
            $table->string('situacao', 12)->default('emitida'); // emitida | paga | cancelada
            $table->foreignId('original_id')->nullable()->constrained('cemetery_charges')->nullOnDelete();
            $table->date('pago_em')->nullable();
            $table->unsignedBigInteger('valor_pago_centavos')->nullable();
            $table->string('comprovante_arquivo')->nullable();
            $table->foreignId('baixado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'numero']);
            $table->index(['tenant_id', 'situacao', 'vencimento']);
            $table->index(['tenant_id', 'origem_type', 'origem_id', 'servico', 'exercicio'], 'charges_origem_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_charges');
        Schema::dropIfExists('cemetery_price_adjustments');
        Schema::dropIfExists('cemetery_price_items');
    }
};
