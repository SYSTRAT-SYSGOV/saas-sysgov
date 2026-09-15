<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_pesquisas_precos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            // Equipe de planejamento própria (mesmo padrão do ETP/Mapa de
            // Riscos: nasce como cópia da equipe do Mapa de Riscos do
            // processo, editável independentemente dali em diante).
            $table->json('equipe_planejamento')->nullable();
            // Itens como JSON, não tabela filha — mesmo padrão dos "itens" do
            // DFD e dos "riscos" do Mapa de Riscos. Nasce como cópia dos
            // itens do DFD do processo (codigo/descricao/unidade_medida/
            // quantidade), cada um ganhando sua própria lista de cotações:
            // {codigo, descricao, unidade_medida, quantidade,
            //  cotacoes: [{fonte, fornecedor, valor_unitario, data_cotacao, referencia}]}.
            // Valor de referência (média/mediana/menor) é calculado no
            // cliente a partir das cotações — nunca armazenado, pelo mesmo
            // motivo do nível/classificação do Mapa de Riscos (nunca fica
            // desatualizado em relação aos valores editados).
            $table->json('itens')->nullable();
            $table->string('metodo_referencia')->default('mediana');
            $table->text('justificativa_metodo')->nullable();
            $table->json('campos_extras')->nullable();
            $table->string('status')->default('rascunho');
            $table->foreignId('elaborado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Um processo tem no máximo uma Pesquisa de Preços ativa — mesma
            // observação do DFD/ETP/Mapa de Riscos: garantido no
            // PesquisaPrecoService::criar(), não por índice único (MySQL não
            // deduplica NULL em deleted_at).
            $table->index(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_pesquisas_precos');
    }
};
