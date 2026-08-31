<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'contracts_tenant_org_unit_index');
        });

        Schema::table('expenses', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'expenses_tenant_org_unit_index');
        });

        Schema::table('revenues', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'revenues_tenant_org_unit_index');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'invoices_tenant_org_unit_index');
        });

        Schema::table('transfers', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'transfers_tenant_org_unit_index');
        });

        Schema::table('budget_commitments', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'budget_commitments_tenant_org_unit_index');
        });

        Schema::table('budget_settlements', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'budget_settlements_tenant_org_unit_index');
        });

        Schema::table('budget_payments', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')->nullable()->after('tenant_id')->constrained('org_units')->nullOnDelete();
            $table->index(['tenant_id', 'org_unit_id'], 'budget_payments_tenant_org_unit_index');
        });
    }

    public function down(): void
    {
        Schema::table('budget_payments', function (Blueprint $table): void {
            $table->dropIndex('budget_payments_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('budget_settlements', function (Blueprint $table): void {
            $table->dropIndex('budget_settlements_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('budget_commitments', function (Blueprint $table): void {
            $table->dropIndex('budget_commitments_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('transfers', function (Blueprint $table): void {
            $table->dropIndex('transfers_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('invoices', function (Blueprint $table): void {
            $table->dropIndex('invoices_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('revenues', function (Blueprint $table): void {
            $table->dropIndex('revenues_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('expenses', function (Blueprint $table): void {
            $table->dropIndex('expenses_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });

        Schema::table('contracts', function (Blueprint $table): void {
            $table->dropIndex('contracts_tenant_org_unit_index');
            $table->dropForeign(['org_unit_id']);
            $table->dropColumn('org_unit_id');
        });
    }
};
