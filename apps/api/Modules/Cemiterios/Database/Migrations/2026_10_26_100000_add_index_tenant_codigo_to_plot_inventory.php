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
            // Acelera listagem e ordenação por código sem filesort em inventários grandes (19k+ registros)
            if (! $this->hasIndex('plot_inventory', 'plot_inventory_tenant_codigo_idx')) {
                $table->index(['tenant_id', 'codigo'], 'plot_inventory_tenant_codigo_idx');
            }
        });
    }

    public function down(): void
    {
        Schema::table('plot_inventory', function (Blueprint $table): void {
            if ($this->hasIndex('plot_inventory', 'plot_inventory_tenant_codigo_idx')) {
                $table->dropIndex('plot_inventory_tenant_codigo_idx');
            }
        });
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        $conn = Schema::getConnection();
        if ($conn->getDriverName() === 'sqlite') {
            $indexes = collect($conn->select("PRAGMA index_list('{$table}')"))->pluck('name')->all();
            return in_array($indexName, $indexes, true);
        }

        $dbName = $conn->getDatabaseName();
        $result = $conn->select(
            'SELECT COUNT(*) as cnt FROM information_schema.statistics WHERE table_schema = ? AND table_name = ? AND index_name = ?',
            [$dbName, $table, $indexName]
        );

        return (int) ($result[0]->cnt ?? 0) > 0;
    }
};
