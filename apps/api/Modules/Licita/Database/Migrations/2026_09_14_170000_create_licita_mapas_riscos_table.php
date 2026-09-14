<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_mapas_riscos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('licita_processos')->cascadeOnDelete();
            // Equipe de planejamento própria (mesmo padrão do ETP: nasce como
            // cópia da equipe do ETP do processo, editável independentemente
            // dali em diante) — usada na folha de assinaturas do PDF.
            $table->json('equipe_planejamento')->nullable();
            // Riscos como JSON, não tabela filha própria — mesmo padrão já
            // usado pelos "itens" do DFD (licita_dfds.itens): cada risco é um
            // objeto {descricao, fase, probabilidade, impacto, causa, dano,
            // alocacao, acao_preventiva, responsavel_prevencao,
            // acao_contingencia, responsavel_contingencia}. Nível e
            // classificação (probabilidade x impacto) são calculados, não
            // armazenados, pra nunca ficarem desatualizados em relação aos
            // valores editados.
            $table->json('riscos')->nullable();
            $table->json('campos_extras')->nullable();
            $table->string('status')->default('rascunho');
            $table->foreignId('elaborado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('aprovado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('aprovado_em')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Um processo tem no máximo um Mapa de Riscos ativo — mesma
            // observação do DFD/ETP: garantido no MapaRiscoService::criar(),
            // não por índice único (MySQL não deduplica NULL em deleted_at).
            $table->index(['processo_id']);
            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_mapas_riscos');
    }
};
