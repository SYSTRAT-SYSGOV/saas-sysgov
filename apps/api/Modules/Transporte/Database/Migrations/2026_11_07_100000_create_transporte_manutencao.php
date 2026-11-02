<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transporte_fornecedores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->restrictOnDelete();
            $table->json('ramos');
            $table->string('contato', 150)->nullable();
            $table->boolean('ativo')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['tenant_id', 'pessoa_id'], 'tr_fornecedores_t_pessoa_uq');
        });

        Schema::create('transporte_ordens_servico', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('veiculo_id')->constrained('transporte_veiculos')->restrictOnDelete();
            $table->foreignId('fornecedor_id')->nullable()->constrained('transporte_fornecedores')->restrictOnDelete();
            $table->string('tipo', 20);
            $table->string('descricao', 500);
            $table->date('aberta_em');
            $table->date('concluida_em')->nullable();
            $table->unsignedInteger('km')->nullable();
            $table->decimal('valor', 12, 2)->nullable();
            $table->string('status', 12);
            $table->string('motivo_cancelamento', 255)->nullable();
            $table->foreignId('criada_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['tenant_id', 'veiculo_id', 'status'], 'tr_os_t_veic_status_ix');
            $table->index(['tenant_id', 'concluida_em'], 'tr_os_t_conclusao_ix');
        });

        Schema::create('transporte_manutencoes_previstas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('veiculo_id')->constrained('transporte_veiculos')->restrictOnDelete();
            $table->string('descricao', 255);
            $table->date('data_prevista')->nullable();
            $table->unsignedInteger('km_previsto')->nullable();
            $table->string('status', 12)->default('pendente');
            $table->foreignId('ordem_servico_id')->nullable()->constrained('transporte_ordens_servico')->nullOnDelete();
            $table->timestamps();
            $table->index(['tenant_id', 'veiculo_id', 'status'], 'tr_prev_t_veic_status_ix');
        });

        Schema::table('transporte_veiculos', function (Blueprint $table): void {
            $table->unsignedInteger('km_atual')->nullable()->after('observacoes');
            $table->timestamp('km_atualizado_em')->nullable()->after('km_atual');
        });
    }

    public function down(): void
    {
        Schema::table('transporte_veiculos', function (Blueprint $table): void {
            $table->dropColumn(['km_atual', 'km_atualizado_em']);
        });
        Schema::dropIfExists('transporte_manutencoes_previstas');
        Schema::dropIfExists('transporte_ordens_servico');
        Schema::dropIfExists('transporte_fornecedores');
    }
};
