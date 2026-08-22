<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table): void { $table->id(); $table->string('name'); $table->string('slug')->unique(); $table->string('cnpj', 14)->nullable()->unique(); $table->enum('type', ['prefeitura', 'parceiro', 'interno']); $table->enum('status', ['active', 'suspended', 'trial'])->default('trial'); $table->json('settings')->nullable(); $table->timestamps(); });
        Schema::create('users', function (Blueprint $table): void { $table->id(); $table->string('name'); $table->string('email')->unique(); $table->timestamp('email_verified_at')->nullable(); $table->string('password'); $table->boolean('is_platform_admin')->default(false); $table->rememberToken(); $table->timestamps(); });
        Schema::create('roles', function (Blueprint $table): void { $table->id(); $table->string('name'); $table->string('guard_name')->default('web'); $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete(); $table->timestamps(); $table->unique(['tenant_id', 'name']); });
        Schema::create('permissions', function (Blueprint $table): void { $table->id(); $table->string('name'); $table->string('guard_name')->default('web'); $table->foreignId('tenant_id')->nullable()->constrained()->cascadeOnDelete(); $table->timestamps(); $table->unique(['tenant_id', 'name']); });
        Schema::create('tenant_user', function (Blueprint $table): void { $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->foreignId('role_id')->nullable()->constrained()->nullOnDelete(); $table->primary(['tenant_id', 'user_id']); });
        Schema::create('role_user', function (Blueprint $table): void { $table->foreignId('role_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->constrained()->cascadeOnDelete(); $table->primary(['role_id', 'user_id']); });
        Schema::create('modules', function (Blueprint $table): void { $table->id(); $table->string('name')->unique(); $table->string('alias')->unique(); $table->json('metadata')->nullable(); $table->boolean('enabled')->default(true); $table->timestamps(); });
        Schema::create('tenant_module', function (Blueprint $table): void { $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('module_id')->constrained()->cascadeOnDelete(); $table->boolean('enabled')->default(true); $table->json('settings')->nullable(); $table->primary(['tenant_id', 'module_id']); });
        Schema::create('audit_logs', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete(); $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); $table->string('module'); $table->string('action'); $table->string('resource'); $table->json('before')->nullable(); $table->json('after')->nullable(); $table->ipAddress('ip')->nullable(); $table->text('user_agent')->nullable(); $table->timestamp('created_at')->useCurrent(); $table->index(['tenant_id', 'created_at']); });
        Schema::create('outbox_events', function (Blueprint $table): void { $table->uuid('event_id')->primary(); $table->string('event_type'); $table->unsignedSmallInteger('event_version')->default(1); $table->foreignId('tenant_id')->nullable()->constrained()->nullOnDelete(); $table->json('payload'); $table->enum('status', ['pending', 'processing', 'done', 'failed'])->default('pending'); $table->unsignedInteger('attempts')->default(0); $table->timestamp('available_at')->useCurrent(); $table->timestamp('processed_at')->nullable(); $table->text('error')->nullable(); $table->index(['tenant_id', 'status', 'available_at']); });
    }
    public function down(): void { Schema::dropIfExists('outbox_events'); Schema::dropIfExists('audit_logs'); Schema::dropIfExists('tenant_module'); Schema::dropIfExists('role_user'); Schema::dropIfExists('tenant_user'); Schema::dropIfExists('permissions'); Schema::dropIfExists('roles'); Schema::dropIfExists('users'); Schema::dropIfExists('modules'); Schema::dropIfExists('tenants'); }
};
