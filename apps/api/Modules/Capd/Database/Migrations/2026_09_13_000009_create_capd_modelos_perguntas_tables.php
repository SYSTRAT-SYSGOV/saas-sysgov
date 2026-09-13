<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_modelos_formulario', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 50);
            $table->string('nome', 150);
            $table->text('descricao')->nullable();
            $table->foreignId('plano_carreira_id')->nullable()->constrained('capd_planos_carreira')->nullOnDelete();
            $table->string('cargo', 100)->nullable();
            $table->unsignedInteger('versao')->default(1);
            $table->date('vigencia_inicio');
            $table->date('vigencia_fim')->nullable();
            $table->json('grupos')->nullable()->comment('Definição de grupos/seções e pesos');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'ativo']);
            $table->index(['tenant_id', 'codigo', 'versao']);
        });

        Schema::create('capd_perguntas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('modelo_id')->constrained('capd_modelos_formulario')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->text('enunciado');
            $table->string('tipo', 30)->comment('escala_grafica, escolha_simples, escolha_multipla, texto_livre, nota_0_10, sim_nao, condicional');
            $table->json('opcoes')->nullable()->comment('Opções ou graus da escala gráfica com descrições sumárias');
            $table->decimal('peso', 5, 2)->default(1.00);
            $table->string('grupo_key', 50)->default('geral');
            $table->unsignedInteger('ordem')->default(0);
            $table->boolean('obrigatoria')->default(true);
            $table->boolean('exige_evidencia')->default(false)->comment('Trava antileniência: exige registro CIT');
            $table->json('regras_condicionais')->nullable()->comment('Condições de exibição/obrigatoriedade baseadas em outras perguntas');
            $table->json('cargos_permitidos')->nullable()->comment('Visível apenas para cargos especificados');
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'modelo_id', 'ativo']);
            $table->index(['tenant_id', 'codigo']);
        });

        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            if (! Schema::hasColumn('capd_avaliacoes', 'modelo_formulario_id')) {
                $table->foreignId('modelo_formulario_id')->nullable()->after('ciclo_id')->constrained('capd_modelos_formulario')->nullOnDelete();
            }
            if (! Schema::hasColumn('capd_avaliacoes', 'respostas_perguntas')) {
                $table->json('respostas_perguntas')->nullable()->after('respostas_fatores');
            }
        });
    }

    public function down(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            if (Schema::hasColumn('capd_avaliacoes', 'modelo_formulario_id')) {
                $table->dropForeign(['modelo_formulario_id']);
                $table->dropColumn('modelo_formulario_id');
            }
            if (Schema::hasColumn('capd_avaliacoes', 'respostas_perguntas')) {
                $table->dropColumn('respostas_perguntas');
            }
        });

        Schema::dropIfExists('capd_perguntas');
        Schema::dropIfExists('capd_modelos_formulario');
    }
};
