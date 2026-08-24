<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('saas_contract_renewals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saas_contract_id')->constrained('saas_contracts')->cascadeOnDelete();
            $table->date('renewed_at');
            $table->date('previous_ends_at');
            $table->date('new_ends_at');
            $table->bigInteger('monthly_fee_cents');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('saas_contract_id');
            $table->index('renewed_at');
        });

        Schema::create('saas_contract_adjustments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saas_contract_id')->constrained('saas_contracts')->cascadeOnDelete();
            $table->date('adjusted_at');
            $table->bigInteger('previous_fee_cents');
            $table->bigInteger('new_fee_cents');
            $table->string('indexer', 30)->nullable();
            $table->decimal('index_value', 10, 6)->nullable();
            $table->text('reason')->nullable();
            $table->timestamps();

            $table->index('saas_contract_id');
            $table->index('adjusted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saas_contract_adjustments');
        Schema::dropIfExists('saas_contract_renewals');
    }
};
