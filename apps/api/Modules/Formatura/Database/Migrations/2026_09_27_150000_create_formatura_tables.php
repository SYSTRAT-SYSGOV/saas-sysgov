<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Formatura sobre o cadastro Escola. Todo valor monetário em centavos inteiros (design D7, nunca float/decimal).
 * Configuração: uma por tenant e ano letivo. Participação: uma por aluno e configuração.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('formatura_configuracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano_letivo');
            $table->string('titulo', 200);
            $table->string('tipo_calculo', 30);
            $table->unsignedBigInteger('valor_base_centavos');
            $table->unsignedBigInteger('valor_pessoa_extra_centavos')->default(0);
            $table->unsignedTinyInteger('convidados_incluidos_padrao')->default(2);
            $table->unsignedTinyInteger('max_parcelas')->default(1);
            $table->json('chaves_pix')->nullable();
            $table->json('formas_pagamento');
            $table->timestamps();

            $table->unique(['tenant_id', 'ano_letivo']);
        });

        Schema::create('formatura_participacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('configuracao_id')->constrained('formatura_configuracoes')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->boolean('participa')->default(true);
            $table->unsignedTinyInteger('convidados_incluidos')->default(0);
            $table->unsignedSmallInteger('convidados_extras')->default(0);
            $table->string('observacoes', 1000)->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'configuracao_id', 'aluno_id'], 'formatura_participacao_unica');
            $table->index(['tenant_id', 'aluno_id']);
        });

        Schema::create('formatura_pagamentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('participacao_id')->constrained('formatura_participacoes')->cascadeOnDelete();
            $table->unsignedTinyInteger('numero_parcela');
            $table->date('data_pagamento');
            $table->unsignedBigInteger('valor_centavos');
            $table->string('forma_pagamento', 20);
            $table->string('chave_pix', 150)->nullable();
            $table->string('observacao', 500)->nullable();
            $table->foreignId('registrado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'participacao_id']);
            $table->index(['tenant_id', 'forma_pagamento']);
            $table->index(['tenant_id', 'data_pagamento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('formatura_pagamentos');
        Schema::dropIfExists('formatura_participacoes');
        Schema::dropIfExists('formatura_configuracoes');
    }
};
