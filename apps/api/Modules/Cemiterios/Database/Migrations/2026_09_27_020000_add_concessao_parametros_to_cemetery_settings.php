<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Regras do ciclo de vida da concessão parametrizáveis por tenant (prop. "nunca constantes fixas").
        Schema::table('cemetery_settings', function (Blueprint $table): void {
            if (!Schema::hasColumn('cemetery_settings', 'concessao_transferencia_permitida')) {
                $table->boolean('concessao_transferencia_permitida')->default(false);
            }
            if (!Schema::hasColumn('cemetery_settings', 'concessao_base_legal_transferencia')) {
                $table->string('concessao_base_legal_transferencia', 40)->nullable();
            }
            if (!Schema::hasColumn('cemetery_settings', 'concessao_vigencia_manifestacao_dias')) {
                $table->unsignedSmallInteger('concessao_vigencia_manifestacao_dias')->default(30);
            }
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_settings', function (Blueprint $table): void {
            foreach (['concessao_transferencia_permitida', 'concessao_base_legal_transferencia', 'concessao_vigencia_manifestacao_dias'] as $coluna) {
                if (Schema::hasColumn('cemetery_settings', $coluna)) {
                    $table->dropColumn($coluna);
                }
            }
        });
    }
};
