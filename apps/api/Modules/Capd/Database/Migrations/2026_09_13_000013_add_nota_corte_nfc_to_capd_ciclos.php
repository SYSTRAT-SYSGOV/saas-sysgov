<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * RN-04 / RN-08: Campos dinâmicos de configuração do ciclo.
 *
 * nota_corte_nfc      — NFC mínima para elegibilidade à progressão.
 *                       100% configurável pela Comissão antes de abrir o ciclo.
 *                       Default: 70.00 (valor sugerido pelo sistema, PRD §RN-04).
 *
 * quinquenio_percentual — percentual de gratificação por quinquênio (art. 17 Lei 1.704/2006).
 *                          Segregado das notas de desempenho (RN-08).
 *                          Default: 5.00%.
 *
 * redistribuir_fator_h  — quando true, o sistema redistribui o peso do fator 'h'
 *                          (Avaliação pelo Usuário) para cargos sem atendimento ao público (RF-06).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_ciclos', function (Blueprint $table): void {
            // NFC mínima de elegibilidade — dinâmica por ciclo (0-100 pontos)
            $table->decimal('nota_corte_nfc', 5, 2)
                ->default(70.00)
                ->after('regras_config')
                ->comment('NFC mínima para progressão — configurável pela Comissão (RN-04)');

            // Percentual de quinquênio — cadastral, segregado do desempenho (RN-08)
            $table->decimal('quinquenio_percentual', 4, 2)
                ->default(5.00)
                ->after('nota_corte_nfc')
                ->comment('% de gratificação por quinquênio (art. 17 Lei 1.704/2006)');

            // Flag de redistribuição do peso do fator H
            $table->boolean('redistribuir_fator_h')
                ->default(false)
                ->after('quinquenio_percentual')
                ->comment('Redistribui peso do fator H para cargos sem atendimento ao público (RF-06)');
        });
    }

    public function down(): void
    {
        Schema::table('capd_ciclos', function (Blueprint $table): void {
            $table->dropColumn(['nota_corte_nfc', 'quinquenio_percentual', 'redistribuir_fator_h']);
        });
    }
};
