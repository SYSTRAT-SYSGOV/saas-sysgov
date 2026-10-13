<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Parâmetros (D2), configurações (D10), bens (D3, D4) e fotos (D12). */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['inservivel_categorias', 'inservivel_estados_conservacao'] as $tabela) {
            Schema::create($tabela, function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
                $table->string('nome', 120);
                $table->boolean('ativo')->default(true);
                $table->timestamps();
                $table->unique(['tenant_id', 'nome']);
            });
        }

        Schema::create('inservivel_situacoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 120);
            $table->string('papel', 30)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome']);
            $table->unique(['tenant_id', 'papel']);
        });

        Schema::create('inservivel_configuracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->unique()->constrained('tenants')->cascadeOnDelete();
            $table->string('doador_nome')->nullable();
            $table->string('doador_cnpj', 14)->nullable();
            $table->string('doador_cidade', 120)->nullable();
            $table->string('doador_uf', 2)->nullable();
            $table->string('foro', 120)->nullable();
            $table->string('responsavel_nome')->nullable();
            $table->string('responsavel_cargo')->nullable();
            $table->json('legislacao')->nullable();
            $table->json('documentos_exigidos')->nullable();
            $table->timestamps();
        });

        Schema::create('inservivel_bens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('numero_patrimonial', 50);
            $table->string('plaqueta_antiga', 50)->nullable();
            $table->text('descricao');
            $table->foreignId('categoria_id')->nullable()->constrained('inservivel_categorias')->nullOnDelete();
            $table->string('marca', 100)->nullable();
            $table->string('modelo', 100)->nullable();
            $table->string('numero_serie', 100)->nullable();
            $table->foreignId('situacao_id')->constrained('inservivel_situacoes');
            $table->foreignId('estado_conservacao_id')->nullable()->constrained('inservivel_estados_conservacao');
            $table->unsignedBigInteger('valor_contabil_cents')->default(0);
            $table->unsignedBigInteger('valor_avaliado_cents')->default(0);
            $table->date('data_aquisicao')->nullable();
            $table->date('data_incorporacao')->nullable();
            $table->foreignId('secretaria_unit_id')->constrained('org_units');
            $table->foreignId('setor_unit_id')->nullable()->constrained('org_units');
            $table->text('observacoes')->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['tenant_id', 'numero_patrimonial']);
            $table->index(['tenant_id', 'situacao_id']);
            $table->index(['tenant_id', 'secretaria_unit_id']);
            $table->index(['tenant_id', 'created_at']);
        });

        Schema::create('inservivel_bem_fotos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('bem_id')->constrained('inservivel_bens')->cascadeOnDelete();
            $table->string('caminho');
            $table->string('mime', 60);
            $table->boolean('principal')->default(false);
            $table->timestamps();
            $table->index(['tenant_id', 'bem_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inservivel_bem_fotos');
        Schema::dropIfExists('inservivel_bens');
        Schema::dropIfExists('inservivel_configuracoes');
        Schema::dropIfExists('inservivel_situacoes');
        Schema::dropIfExists('inservivel_estados_conservacao');
        Schema::dropIfExists('inservivel_categorias');
    }
};
