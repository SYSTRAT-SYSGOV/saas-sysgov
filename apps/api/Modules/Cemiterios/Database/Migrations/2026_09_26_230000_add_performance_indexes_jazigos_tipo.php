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
            // Índice composto para acelerar filtros de tipo de jazigo por necrópole
            $table->index(['tenant_id', 'park_id', 'tipo'], 'plot_inventory_tenant_park_tipo_idx');
            // Índice composto para acelerar filtros de ocupação por necrópole
            $table->index(['tenant_id', 'park_id', 'ocupacao'], 'plot_inventory_tenant_park_ocupacao_idx');
        });
    }

    public function down(): void
    {
        Schema::table('plot_inventory', function (Blueprint $table): void {
            $table->dropIndex('plot_inventory_tenant_park_tipo_idx');
            $table->dropIndex('plot_inventory_tenant_park_ocupacao_idx');
        });
    }
};
