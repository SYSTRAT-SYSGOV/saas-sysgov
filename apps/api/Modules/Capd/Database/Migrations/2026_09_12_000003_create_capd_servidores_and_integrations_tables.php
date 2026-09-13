<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Cadastro Universal de Servidores Públicos ──────────────
        Schema::create('capd_servidores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('matricula', 30);
            $table->string('cpf', 14);
            $table->string('pis_pasep', 20)->nullable();
            $table->string('nome_completo', 150);
            $table->string('nome_social', 150)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('telefone', 25)->nullable();
            $table->date('data_nascimento')->nullable();

            // Vínculo funcional
            $table->string('regime_juridico', 30)->default('estatutario'); // estatutario, clt, comissionado, temporario, estagiario
            $table->string('regime_previdenciario', 20)->default('rpps'); // rpps, rgps
            $table->date('data_admissao')->nullable();
            $table->date('data_posse')->nullable();
            $table->date('data_exercicio')->nullable();
            $table->integer('carga_horaria_semanal')->default(40);

            // Cargo & Carreira
            $table->string('cargo_efetivo', 120);
            $table->string('funcao_gratificada', 120)->nullable();
            $table->string('nivel_padrao', 30)->nullable(); // A-I, B-II, etc.
            $table->foreignId('plano_carreira_id')->nullable()->constrained('capd_planos_carreira')->nullOnDelete();

            // Lotação e Chefia
            $table->string('orgao_lotacao', 150); // Secretaria / Órgão
            $table->string('lotacao_fisica', 150)->nullable(); // Unidade de trabalho
            $table->foreignId('chefia_imediata_id')->nullable()->constrained('capd_servidores')->nullOnDelete();

            // Situação funcional
            $table->string('situacao_funcional', 35)->default('ativo'); // ativo, afastado_saude, licenca_premio, licenca_maternidade, cedido, exonerado, aposentado

            // Estágio Probatório (CF Art. 41)
            $table->boolean('estagio_probatorio')->default(false);
            $table->integer('estagio_fase_atual')->nullable()->default(1); // 1 a 6
            $table->date('estagio_data_fim')->nullable();
            $table->string('estagio_status', 30)->default('em_andamento'); // em_andamento, aprovado, reprovado, suspenso

            // Metadados de integração
            $table->string('origem_sistema', 50)->default('manual'); // manual, betha, ipm, senior, totvs, generic_rest
            $table->json('metadata')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'matricula']);
            $table->index(['tenant_id', 'cpf']);
            $table->index(['tenant_id', 'situacao_funcional']);
            $table->index(['tenant_id', 'estagio_probatorio']);
            $table->index(['tenant_id', 'orgao_lotacao']);
            $table->unique(['tenant_id', 'matricula']);
        });

        // ── 2. Histórico de Afastamentos e Licenças ───────────────────
        Schema::create('capd_servidor_afastamentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('servidor_id')->constrained('capd_servidores')->cascadeOnDelete();
            $table->string('tipo_afastamento', 50); // ferias, licenca_saude, licenca_maternidade, licenca_premio, licenca_interesse_particular, cessao, outro
            $table->date('data_inicio');
            $table->date('data_fim')->nullable();
            $table->integer('dias_afastado')->nullable();
            $table->boolean('suspende_avaliacao')->default(true);
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'servidor_id']);
            $table->index(['tenant_id', 'data_inicio']);
        });

        // ── 3. Configurações de Integração com Sistemas de RH ─────────
        Schema::create('capd_rh_integracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('driver', 40)->default('generic_rest'); // betha, ipm, senior, totvs, generic_rest
            $table->string('api_key', 64)->unique();
            $table->string('api_url', 500)->nullable();
            $table->text('api_token')->nullable();
            $table->string('webhook_url', 500)->nullable();
            $table->string('webhook_secret', 100)->nullable();
            $table->json('field_mappings')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('ultima_sincronizacao_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
            $table->index('api_key');
        });

        // ── 4. Logs de Sincronização Inbound / Outbound ────────────────
        Schema::create('capd_rh_sync_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('integracao_id')->nullable()->constrained('capd_rh_integracoes')->cascadeOnDelete();
            $table->string('tipo', 40); // servidores, frequencia, afastamentos, homologacao, webhook
            $table->string('direcao', 15)->default('inbound'); // inbound, outbound
            $table->string('status', 20)->default('sucesso'); // sucesso, erro, parcial
            $table->integer('registros_processados')->default(0);
            $table->integer('registros_sucesso')->default(0);
            $table->integer('registros_falha')->default(0);
            $table->json('detalhes')->nullable();
            $table->string('ip_origem', 45)->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'tipo', 'status']);
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_rh_sync_logs');
        Schema::dropIfExists('capd_rh_integracoes');
        Schema::dropIfExists('capd_servidor_afastamentos');
        Schema::dropIfExists('capd_servidores');
    }
};
