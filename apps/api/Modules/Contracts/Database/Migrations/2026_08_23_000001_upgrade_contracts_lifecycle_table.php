<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->string('contract_type')->default('termo_contrato')->after('title');
            $table->string('supplier_name')->nullable()->after('contract_type');
            $table->string('supplier_cnpj', 18)->nullable()->after('supplier_name');
            $table->foreignId('manager_id')->nullable()->after('supplier_cnpj')->constrained('users')->nullOnDelete();
            $table->foreignId('inspector_id')->nullable()->after('manager_id')->constrained('users')->nullOnDelete();
            $table->unsignedBigInteger('total_addenda_amount_cents')->default(0)->after('amount_cents');
            $table->decimal('max_addenda_percent', 5, 2)->default(25.00)->after('total_addenda_amount_cents');
            $table->text('cancellation_reason')->nullable()->after('renewal_rule');
            
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'contract_type']);
        });
    }

    public function down(): void
    {
        Schema::table('contracts', function (Blueprint $table): void {
            $table->dropForeign(['manager_id']);
            $table->dropForeign(['inspector_id']);
            $table->dropColumn([
                'contract_type',
                'supplier_name',
                'supplier_cnpj',
                'manager_id',
                'inspector_id',
                'total_addenda_amount_cents',
                'max_addenda_percent',
                'cancellation_reason',
            ]);
        });
    }
};
