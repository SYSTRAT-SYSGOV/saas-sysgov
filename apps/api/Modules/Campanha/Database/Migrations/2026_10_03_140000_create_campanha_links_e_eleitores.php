<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Captação de eleitores (Fase 2A): links públicos com código imprevisível por responsável (D1) e eleitores
 * captados, com os campos pessoais criptografados (text), hash do WhatsApp para deduplicar e a prova do
 * consentimento (D3). Eleitor não tem soft delete: a exclusão a pedido do titular é definitiva (D5).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_links', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->char('codigo', 16)->unique();
            $table->string('tipo', 20);
            $table->foreignId('coordenador_id')->nullable()->constrained('campanha_coordenadores')->nullOnDelete();
            $table->foreignId('cabo_id')->nullable()->constrained('campanha_cabos')->nullOnDelete();
            $table->string('descricao', 150)->nullable();
            $table->boolean('ativo')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'campanha_id', 'ativo']);
        });

        Schema::create('campanha_eleitores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->foreignId('link_id')->nullable()->constrained('campanha_links')->nullOnDelete();
            $table->foreignId('coordenador_id')->nullable()->constrained('campanha_coordenadores')->nullOnDelete();
            $table->foreignId('cabo_id')->nullable()->constrained('campanha_cabos')->nullOnDelete();
            $table->text('nome')->nullable();
            $table->unsignedInteger('codigo_ibge');
            $table->string('bairro', 150)->nullable();
            $table->unsignedSmallInteger('zona')->nullable();
            $table->unsignedSmallInteger('secao')->nullable();
            $table->text('whatsapp')->nullable();
            $table->char('whatsapp_hash', 64)->nullable();
            $table->text('data_nascimento')->nullable();
            $table->text('demanda')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedInteger('precisao_m')->nullable();
            $table->unsignedInteger('consentimento_versao');
            $table->timestamp('consentido_em');
            $table->text('ip')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('anonimizado_em')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'campanha_id', 'whatsapp_hash']);
            $table->index(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'campanha_id', 'created_at']);
            $table->index(['tenant_id', 'link_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_eleitores');
        Schema::dropIfExists('campanha_links');
    }
};
