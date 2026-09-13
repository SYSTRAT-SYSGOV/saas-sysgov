<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->dropUnique(['tenant_id', 'ciclo_id', 'servidor_id']);
            $table->unique(
                ['tenant_id', 'ciclo_id', 'servidor_id', 'tipo_avaliacao', 'periodo_inicio'],
                'capd_avaliacoes_tenant_ciclo_servidor_tipo_periodo_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->dropUnique('capd_avaliacoes_tenant_ciclo_servidor_tipo_periodo_unique');
            $table->unique(['tenant_id', 'ciclo_id', 'servidor_id']);
        });
    }
};
