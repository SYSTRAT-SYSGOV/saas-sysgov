<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['revenues', 'expenses', 'invoices', 'transfers'] as $tableName) Schema::create($tableName, function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->string('description'); $table->unsignedBigInteger('amount_cents'); $table->date('occurred_at'); $table->string('status')->default('pending'); $table->timestamps(); $table->index(['tenant_id', 'occurred_at']); });
        Schema::create('reconciliations', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->string('reference'); $table->unsignedBigInteger('amount_cents'); $table->date('reconciled_at')->nullable(); $table->string('status')->default('pending'); $table->timestamps(); $table->unique(['tenant_id', 'reference']); });
    }
    public function down(): void { Schema::dropIfExists('reconciliations'); foreach (['transfers', 'invoices', 'expenses', 'revenues'] as $tableName) Schema::dropIfExists($tableName); }
};
