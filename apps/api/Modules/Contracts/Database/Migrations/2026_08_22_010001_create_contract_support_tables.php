<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('contract_attachments', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('contract_id')->constrained()->cascadeOnDelete(); $table->string('name'); $table->string('storage_key'); $table->string('mime_type', 120); $table->unsignedBigInteger('size_bytes'); $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete(); $table->timestamps(); $table->index(['tenant_id', 'contract_id']); });
        Schema::create('contract_addenda', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('contract_id')->constrained()->cascadeOnDelete(); $table->string('number'); $table->text('reason'); $table->unsignedBigInteger('amount_cents')->default(0); $table->date('effective_at'); $table->timestamps(); $table->unique(['tenant_id', 'contract_id', 'number']); });
        Schema::create('contract_history', function (Blueprint $table): void { $table->id(); $table->foreignId('tenant_id')->constrained()->cascadeOnDelete(); $table->foreignId('contract_id')->constrained()->cascadeOnDelete(); $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete(); $table->string('action'); $table->json('before')->nullable(); $table->json('after')->nullable(); $table->timestamp('created_at')->useCurrent(); $table->index(['tenant_id', 'contract_id', 'created_at']); });
    }
    public function down(): void { Schema::dropIfExists('contract_history'); Schema::dropIfExists('contract_addenda'); Schema::dropIfExists('contract_attachments'); }
};
