<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas_sync_logs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('integracao_id')->nullable()->constrained('pessoas_integracoes')->nullOnDelete();
            $table->string('tipo', 30)->default('importacao_pessoa');
            $table->string('direcao', 10)->default('inbound');
            $table->string('status', 15);
            $table->unsignedInteger('registros_processados')->default(0);
            $table->unsignedInteger('registros_sucesso')->default(0);
            $table->unsignedInteger('registros_falha')->default(0);
            $table->json('detalhes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'integracao_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas_sync_logs');
    }
};
