<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas_integracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('driver', 20)->default('generic_rest');
            $table->string('api_url', 500)->nullable();
            $table->text('api_token')->nullable();
            $table->json('field_mappings')->nullable();
            $table->boolean('is_active')->default(false);
            $table->timestamp('ultima_sincronizacao_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas_integracoes');
    }
};
