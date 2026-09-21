<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `objeto`, `justificativa`, `data_previsao` e `grau_prioridade` deixam de
 * ser NOT NULL — a obrigatoriedade de cada um passa a ser uma seção nativa
 * configurável pelo tenant (ver CampoConfiguracaoService::CAMPOS_NATIVOS
 * ['dfd']), como já é o caso do TR e do ETP. O default de fábrica
 * (`obrigatorio_padrao`) continua true pros quatro, então nada muda pra
 * quem nunca reconfigurou o DFD.
 *
 * `equipe_planejamento` e `itens` NÃO entram nessa migração de propósito:
 * a equipe tem um mínimo legal de 2 pessoas (segregação de funções, art. 7º
 * da Lei 14.133/2021) imposto por uma regra própria (min:2 no
 * DfdController, RN-005 no DfdService), não pelo mecanismo genérico de
 * "obrigatório"; e itens já têm seu próprio esquema de campos configuráveis
 * por tipo (dfd_item_material/dfd_item_servico), não fazem sentido como um
 * único "campo nativo".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licita_dfds', function (Blueprint $table): void {
            $table->string('objeto', 500)->nullable()->change();
            $table->text('justificativa')->nullable()->change();
            $table->date('data_previsao')->nullable()->change();
            $table->string('grau_prioridade')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('licita_dfds', function (Blueprint $table): void {
            $table->string('objeto', 500)->nullable(false)->change();
            $table->text('justificativa')->nullable(false)->change();
            $table->date('data_previsao')->nullable(false)->change();
            $table->string('grau_prioridade')->nullable(false)->change();
        });
    }
};
