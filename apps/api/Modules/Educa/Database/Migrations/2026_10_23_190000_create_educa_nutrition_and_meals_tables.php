<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cabeçalho dos Cardápios Escolares (PNAE)
        Schema::create('educa_menus', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('academic_year_id')->nullable()->constrained('educa_academic_years')->nullOnDelete();
            $table->foreignUuid('school_id')->nullable()->constrained('educa_schools')->nullOnDelete();
            $table->string('nome', 255);
            $table->text('descricao')->nullable();
            $table->string('etapa_ensino', 50); // creche, infantil, fundamental, medio, eja, integral
            $table->string('tipo_refeicao', 50)->default('almoco'); // desjejum, lanche_manha, almoco, lanche_tarde, jantar
            $table->string('periodo', 50)->default('semanal'); // semanal, quinzenal, mensal
            $table->date('vigencia_inicio')->nullable();
            $table->date('vigencia_fim')->nullable();
            $table->string('status', 30)->default('rascunho'); // rascunho, homologado, rejeitado, inativo
            $table->string('responsavel_tecnico_nome', 255)->nullable();
            $table->string('responsavel_tecnico_crn', 50)->nullable();
            $table->timestamp('homologado_em')->nullable();
            $table->foreignId('homologado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'etapa_ensino']);
            $table->index(['tenant_id', 'vigencia_inicio', 'vigencia_fim']);
        });

        // 2. Preparações e Itens Nutricionais do Cardápio
        Schema::create('educa_menu_items', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('menu_id')->constrained('educa_menus')->cascadeOnDelete();
            $table->unsignedTinyInteger('dia_semana'); // 1=Dom, 2=Seg, ..., 7=Sab
            $table->string('nome_preparacao', 255);
            $table->text('ingredientes')->nullable();
            $table->string('medida_caseira', 100)->nullable();
            $table->decimal('porcao_gramas', 8, 2)->default(0);
            $table->decimal('calorias_kcal', 8, 2)->default(0);
            $table->decimal('carboidratos_g', 8, 2)->default(0);
            $table->decimal('proteinas_g', 8, 2)->default(0);
            $table->decimal('lipidios_g', 8, 2)->default(0);
            $table->decimal('fibras_g', 8, 2)->default(0);
            $table->decimal('sodio_mg', 8, 2)->default(0);
            $table->json('alergenos')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'menu_id', 'dia_semana']);
        });

        // 3. Prontuário de Restrições Alimentares e Alergias de Estudantes
        Schema::create('educa_dietary_restrictions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('tipo_restricao', 50); // alergia_alimentar, intolerancia, diabetes, doenca_celiaca, etc.
            $table->string('alimento_alergeno', 255);
            $table->string('severidade', 30)->default('moderada'); // leve, moderada, grave_anafilaxia
            $table->text('sintomas_reacao')->nullable();
            $table->text('conduta_emergencia')->nullable();
            $table->boolean('requer_substituicao_especial')->default(false);
            $table->string('alimento_substituto_recomendado', 255)->nullable();
            $table->string('laudo_medico_crm', 50)->nullable();
            $table->string('laudo_medico_emissor', 255)->nullable();
            $table->date('laudo_medico_data')->nullable();
            $table->string('laudo_documento_url', 1000)->nullable();
            $table->text('observacoes')->nullable();
            $table->string('status', 30)->default('ativa'); // ativa, inativa
            $table->foreignId('responsavel_registro_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'pessoa_id', 'status']);
            $table->index(['tenant_id', 'tipo_restricao']);
            $table->index(['tenant_id', 'severidade']);
        });

        // 4. Registro Diário de Refeições Servidas e Desperdício (CAE/FNDE)
        Schema::create('educa_meal_logs', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignUuid('school_id')->constrained('educa_schools')->cascadeOnDelete();
            $table->foreignUuid('menu_id')->nullable()->constrained('educa_menus')->nullOnDelete();
            $table->date('data_consumo');
            $table->string('tipo_refeicao', 50); // desjejum, lanche_manha, almoco, lanche_tarde, jantar
            $table->unsignedInteger('total_previsto')->default(0);
            $table->unsignedInteger('total_servido')->default(0);
            $table->decimal('taxa_adesao_percentual', 5, 2)->default(0);
            $table->decimal('sobra_limpa_kg', 8, 2)->default(0);
            $table->decimal('resto_ingesta_kg', 8, 2)->default(0);
            $table->decimal('temperatura_servico_celsius', 5, 2)->nullable();
            $table->text('observacoes')->nullable();
            $table->foreignId('responsavel_registro_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'school_id', 'data_consumo']);
            $table->index(['tenant_id', 'data_consumo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('educa_meal_logs');
        Schema::dropIfExists('educa_dietary_restrictions');
        Schema::dropIfExists('educa_menu_items');
        Schema::dropIfExists('educa_menus');
    }
};
