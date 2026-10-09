<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_integracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 100);
            $table->string('orgao', 20);
            // Só o hash SHA-256 da chave fica no banco — a chave em texto puro é mostrada
            // uma única vez, na criação. O prefixo serve para o gestor identificar a chave.
            $table->char('api_key_hash', 64)->unique();
            $table->string('api_key_prefixo', 12);
            $table->boolean('is_active')->default(true);
            $table->timestamp('ultimo_uso_em')->nullable();
            // Envio ativo (push) — opcional; só órgãos que exigem recebimento ativo.
            $table->string('envio_url', 500)->nullable();
            $table->text('envio_token')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_active'], 'ma_integracoes_ativa_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_integracoes');
    }
};
