<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabela de plataforma (não é `TenantAware`: o token prova o controle do e-mail antes de existir
 * qualquer sessão/contexto de tenant). `tenant_id` identifica qual vínculo `tenant_user` o clique
 * no link deve ativar (design D5/D6) — uma pessoa pode ter cadastros pendentes em mais de um
 * órgão ao mesmo tempo, cada um com seu próprio token.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verification_tokens', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'tenant_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_tokens');
    }
};
