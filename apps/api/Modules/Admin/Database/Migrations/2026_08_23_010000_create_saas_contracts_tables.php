<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('saas_contracts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('number', 60);
            $table->string('title');
            $table->string('plan', 60)->default('standard');
            $table->date('starts_at');
            $table->date('ends_at');
            $table->bigInteger('monthly_fee_cents');
            $table->bigInteger('setup_fee_cents')->default(0);
            $table->json('renewal_rule')->nullable();
            $table->string('status', 30)->default('active');
            $table->text('cancellation_reason')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'number']);
            $table->index(['tenant_id', 'status']);
            $table->index('ends_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saas_contracts');
    }
};
