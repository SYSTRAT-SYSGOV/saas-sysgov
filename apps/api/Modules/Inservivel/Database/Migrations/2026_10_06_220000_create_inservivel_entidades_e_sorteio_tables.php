<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Entidades e documentos (D6, D15), inscrições nos lotes e sorteios (D8). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inservivel_entidades', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('razao_social');
            $table->string('nome_fantasia');
            $table->string('cnpj', 14);
            $table->string('inscricao_estadual', 30)->nullable();
            $table->string('inscricao_municipal', 30)->nullable();
            $table->string('endereco');
            $table->string('cep', 8);
            $table->string('cidade', 120);
            $table->string('uf', 2);
            $table->string('telefone', 20)->nullable();
            $table->string('celular', 20);
            $table->string('email');
            $table->string('representante_legal');
            $table->text('cpf_representante');
            $table->string('rg_representante', 30)->nullable();
            $table->string('cargo_representante', 120);
            $table->unsignedSmallInteger('tempo_funcionamento_anos');
            $table->string('area_atuacao');
            $table->text('finalidade');
            $table->unsignedInteger('numero_beneficiarios');
            $table->text('certificacoes')->nullable();
            $table->string('banco', 80)->nullable();
            $table->string('agencia', 20)->nullable();
            $table->string('conta', 30)->nullable();
            $table->string('chave_pix', 120)->nullable();
            $table->string('status', 20)->default('pendente');
            $table->text('motivo_reprovacao')->nullable();
            $table->unsignedInteger('lotes_ganhos')->default(0);
            $table->timestamps();
            $table->unique(['tenant_id', 'cnpj']);
            $table->unique(['tenant_id', 'email']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'user_id']);
        });

        Schema::create('inservivel_entidade_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('entidade_id')->constrained('inservivel_entidades')->cascadeOnDelete();
            $table->string('tipo', 60);
            $table->string('caminho');
            $table->string('mime', 60);
            $table->date('data_envio');
            $table->date('validade')->nullable();
            $table->string('situacao', 20)->default('pendente');
            $table->text('observacao_prefeitura')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'entidade_id', 'tipo']);
            $table->index(['tenant_id', 'validade']);
        });

        Schema::create('inservivel_interesses', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('entidade_id')->constrained('inservivel_entidades')->cascadeOnDelete();
            $table->foreignId('lote_id')->constrained('inservivel_lotes')->cascadeOnDelete();
            $table->string('ip', 45)->nullable();
            $table->timestamps();
            $table->unique(['entidade_id', 'lote_id']);
            $table->index(['tenant_id', 'lote_id']);
        });

        Schema::create('inservivel_sorteios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('lote_id')->unique()->constrained('inservivel_lotes');
            $table->foreignId('entidade_vencedora_id')->constrained('inservivel_entidades');
            $table->dateTime('data_sorteio');
            $table->string('regra', 30);
            $table->string('semente', 64)->nullable();
            $table->json('participantes');
            $table->json('empatadas')->nullable();
            $table->string('hash', 64);
            $table->foreignId('realizado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->index(['tenant_id', 'entidade_vencedora_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inservivel_sorteios');
        Schema::dropIfExists('inservivel_interesses');
        Schema::dropIfExists('inservivel_entidade_documentos');
        Schema::dropIfExists('inservivel_entidades');
    }
};
