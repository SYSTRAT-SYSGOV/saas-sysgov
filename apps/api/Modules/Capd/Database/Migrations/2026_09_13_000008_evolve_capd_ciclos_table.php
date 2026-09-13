<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_ciclos', function (Blueprint $table): void {
            if (! Schema::hasColumn('capd_ciclos', 'ano_competencia')) {
                $table->integer('ano_competencia')->nullable()->after('tenant_id');
            }
            if (! Schema::hasColumn('capd_ciclos', 'data_inicio')) {
                $table->date('data_inicio')->nullable()->after('nome');
            }
            if (! Schema::hasColumn('capd_ciclos', 'data_fim')) {
                $table->date('data_fim')->nullable()->after('data_inicio');
            }
            if (! Schema::hasColumn('capd_ciclos', 'data_limite_preenchimento')) {
                $table->date('data_limite_preenchimento')->nullable()->after('data_fim');
            }
            if (! Schema::hasColumn('capd_ciclos', 'cadencia_automatica')) {
                $table->boolean('cadencia_automatica')->default(true)->after('status');
            }
            if (! Schema::hasColumn('capd_ciclos', 'etapa_cadencia')) {
                $table->unsignedTinyInteger('etapa_cadencia')->default(1)->after('cadencia_automatica');
            }
            if (! Schema::hasColumn('capd_ciclos', 'regras_config')) {
                $table->json('regras_config')->nullable()->after('metadata');
            }
        });

        // Sincroniza dados legados se existirem
        if (Schema::hasColumn('capd_ciclos', 'ano_referencia') && Schema::hasColumn('capd_ciclos', 'ano_competencia')) {
            DB::table('capd_ciclos')
                ->whereNull('ano_competencia')
                ->update([
                    'ano_competencia' => DB::raw('ano_referencia'),
                    'data_inicio'     => DB::raw('data_inicio_avaliacao'),
                    'data_fim'        => DB::raw('data_fim_avaliacao'),
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('capd_ciclos', function (Blueprint $table): void {
            $cols = [
                'ano_competencia',
                'data_inicio',
                'data_fim',
                'data_limite_preenchimento',
                'cadencia_automatica',
                'etapa_cadencia',
                'regras_config',
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('capd_ciclos', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
