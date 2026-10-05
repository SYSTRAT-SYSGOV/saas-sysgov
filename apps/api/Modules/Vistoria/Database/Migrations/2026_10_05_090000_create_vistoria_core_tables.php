<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Locais fiscalizáveis ──────────────────────────────────────
        Schema::create('vistoria_locais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('proprietario_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('nome', 255);
            $table->string('tipo', 40); // propriedade_rural, estabelecimento_comercial, feira, evento, outro
            $table->string('classificacao_atividade', 60)->nullable(); // producao_animal, producao_vegetal, agroindustria, comercio_insumos, outro
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->string('endereco', 255)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'tipo']);
            $table->index(['tenant_id', 'proprietario_pessoa_id']);
        });

        // ── 2. Ordens de serviço de vistoria ──────────────────────────────
        Schema::create('vistoria_ordens_servico', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('local_id')->constrained('vistoria_locais')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->foreignId('fiscal_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('tipo_acao', 30); // vistoria_rotina, inspecao_sanitaria, atendimento_denuncia, reinspecao, autuacao
            $table->string('criticidade', 10)->default('media'); // baixa, media, alta, urgente
            $table->string('status', 20)->default('agendada'); // agendada, em_execucao, concluida, cancelada
            $table->date('data_prevista');
            $table->text('roteiro_deslocamento')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'fiscal_id', 'status']);
            $table->index(['tenant_id', 'org_unit_id', 'status']);
            $table->index(['tenant_id', 'data_prevista']);
        });

        // ── 3. Contadores de numeração sequencial (por tipo de documento/exercício) ──
        Schema::create('vistoria_contadores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo_slug', 50); // auto_infracao, notificacao, termo_embargo, termo_apreensao
            $table->integer('exercicio');
            $table->integer('ultimo_numero')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'tipo_slug', 'exercicio'], 'vistoria_contador_unq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_contadores');
        Schema::dropIfExists('vistoria_ordens_servico');
        Schema::dropIfExists('vistoria_locais');
    }
};
