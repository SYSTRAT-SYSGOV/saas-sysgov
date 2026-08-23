<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    private const TABLES = ['revenues', 'expenses', 'invoices', 'transfers'];

    public function up(): void
    {
        foreach (self::TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->foreignId('contract_id')->nullable()->constrained()->nullOnDelete()->after('tenant_id');
                $table->foreignId('budget_unit_id')->nullable()->constrained()->nullOnDelete()->after('contract_id');
                $table->date('due_at')->nullable()->after('occurred_at');
                $table->date('paid_at')->nullable()->after('due_at');
                $table->index(['tenant_id', 'status']);
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $tableName) {
            Schema::table($tableName, function (Blueprint $table): void {
                $table->dropIndex(['tenant_id', 'status']);
                $table->dropColumn(['contract_id', 'budget_unit_id', 'due_at', 'paid_at']);
            });
        }
    }
};
