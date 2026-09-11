<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licita_dfds', function (Blueprint $table): void {
            // Itens de material/serviço associados ao DFD — mesmo padrão de
            // equipe_planejamento (lista JSON dentro do próprio DFD, sem
            // tabela própria): cada item já carrega seu próprio
            // `campos_extras`, validado contra a configuração ativa do
            // tenant para 'dfd_item_material'/'dfd_item_servico' (ver
            // CampoConfiguracaoService), do mesmo jeito que o DFD valida
            // seu campos_extras contra 'dfd'.
            $table->json('itens')->nullable()->after('campos_extras');
        });
    }

    public function down(): void
    {
        Schema::table('licita_dfds', function (Blueprint $table): void {
            $table->dropColumn('itens');
        });
    }
};
