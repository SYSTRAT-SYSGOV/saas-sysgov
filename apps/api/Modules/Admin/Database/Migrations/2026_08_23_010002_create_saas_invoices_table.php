<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('saas_invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('saas_contract_id')->constrained('saas_contracts')->cascadeOnDelete();
            $table->string('number', 60);
            $table->date('reference_month');
            $table->bigInteger('amount_cents');
            $table->string('status', 30)->default('open');
            $table->date('issued_at');
            $table->date('due_at');
            $table->date('paid_at')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'number']);
            $table->index(['tenant_id', 'status']);
            $table->index('due_at');
            $table->index('reference_month');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saas_invoices');
    }
};
