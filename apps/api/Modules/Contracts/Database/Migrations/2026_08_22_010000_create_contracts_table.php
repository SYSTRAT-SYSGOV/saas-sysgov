<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('contracts', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
            $table->string('number');
            $table->string('title');
            $table->date('starts_at');
            $table->date('ends_at');
            $table->unsignedBigInteger('amount_cents');
            $table->string('status')->default('active');
            $table->string('renewal_rule')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'number']);
            $table->index(['tenant_id', 'ends_at']);
        });
    }
    public function down(): void { Schema::dropIfExists('contracts'); }
};
