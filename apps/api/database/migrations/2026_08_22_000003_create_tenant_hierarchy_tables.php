<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->string('name'); $table->string('code', 30); $table->timestamps(); $table->unique(['tenant_id', 'code']); });
        Schema::create('departments', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('organization_id')->constrained()->cascadeOnDelete(); $table->string('name'); $table->string('code', 30); $table->timestamps(); $table->unique(['tenant_id', 'code']); $table->index(['tenant_id', 'organization_id']); });
        Schema::create('management_units', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('department_id')->constrained()->cascadeOnDelete(); $table->string('name'); $table->string('code', 30); $table->timestamps(); $table->unique(['tenant_id', 'code']); $table->index(['tenant_id', 'department_id']); });
        Schema::create('budget_units', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('management_unit_id')->constrained()->cascadeOnDelete(); $table->string('name'); $table->string('code', 30); $table->timestamps(); $table->unique(['tenant_id', 'code']); $table->index(['tenant_id', 'management_unit_id']); });
    }
    public function down(): void { Schema::dropIfExists('budget_units'); Schema::dropIfExists('management_units'); Schema::dropIfExists('departments'); Schema::dropIfExists('organizations'); }
};
