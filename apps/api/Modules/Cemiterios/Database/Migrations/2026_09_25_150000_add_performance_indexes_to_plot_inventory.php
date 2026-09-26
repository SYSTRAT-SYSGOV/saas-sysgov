<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plot_inventory', function (Blueprint $table): void {
            // Índice composto para filtros por parque e setor sob o mesmo tenant
            $table->index(['tenant_id', 'park_id', 'sector_id'], 'plot_inventory_tenant_park_sector_idx');
            // Índice composto para filtros por parque e estado operacional sob o mesmo tenant
            $table->index(['tenant_id', 'park_id', 'estado'], 'plot_inventory_tenant_park_estado_idx');
        });
    }

    public function down(): void
    {
        Schema::table('plot_inventory', function (Blueprint $table): void {
            $table->dropIndex('plot_inventory_tenant_park_sector_idx');
            $table->dropIndex('plot_inventory_tenant_park_estado_idx');
        });
    }
};
