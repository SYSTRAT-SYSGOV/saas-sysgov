<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Passeios sobre o cadastro Escola. Valor por aluno em centavos (design D7).
 * Inscrição: uma por passeio × aluno (reinscrever restaura a excluída). Assentos: um aluno por assento e
 * um assento por aluno em cada passeio — garantidos por índices únicos (design D4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('passeio_passeios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 250);
            $table->date('data_passeio');
            $table->date('data_limite_autorizacao')->nullable();
            $table->time('horario_saida');
            $table->time('horario_retorno')->nullable();
            $table->string('local_saida', 250);
            $table->string('destino', 250);
            $table->string('cidade', 150);
            $table->unsignedBigInteger('valor_centavos')->default(0);
            $table->string('responsavel', 200);
            $table->text('observacoes')->nullable();
            $table->string('status', 20)->default('agendado');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'data_passeio']);
        });

        Schema::create('passeio_inscricoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('passeio_id')->constrained('passeio_passeios')->cascadeOnDelete();
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->boolean('vai')->default(true);
            $table->boolean('autorizacao_entregue')->default(false);
            $table->boolean('pago')->default(false);
            $table->string('observacao', 500)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'passeio_id', 'aluno_id'], 'passeio_inscricao_unica');
            $table->index(['tenant_id', 'aluno_id']);
        });

        Schema::create('passeio_veiculos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('passeio_id')->constrained('passeio_passeios')->cascadeOnDelete();
            $table->string('identificacao', 150);
            $table->string('placa', 10);
            $table->string('motorista', 200);
            $table->string('telefone', 30)->nullable();
            $table->unsignedTinyInteger('capacidade');
            $table->string('cor', 20)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'passeio_id']);
        });

        Schema::create('passeio_assentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('passeio_id')->constrained('passeio_passeios')->cascadeOnDelete();
            $table->foreignId('veiculo_id')->constrained('passeio_veiculos')->cascadeOnDelete();
            $table->unsignedTinyInteger('numero');
            $table->foreignId('aluno_id')->constrained('escola_alunos')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'veiculo_id', 'numero'], 'passeio_assento_unico');
            $table->unique(['tenant_id', 'passeio_id', 'aluno_id'], 'passeio_assento_aluno_unico');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('passeio_assentos');
        Schema::dropIfExists('passeio_veiculos');
        Schema::dropIfExists('passeio_inscricoes');
        Schema::dropIfExists('passeio_passeios');
    }
};
