<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 * Módulo Ata (change criar-modulo-ata). Secretarias = unidades do Organograma (D1); participantes podem vir do
 * Cadastro de Pessoas ou ser avulsos (D2); o PDF oficial fica guardado com hash (D4).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ata_tipos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 150);
            $table->boolean('ativo')->default(true);
            $table->timestamps();
            $table->unique(['tenant_id', 'nome']);
        });

        Schema::create('ata_secretaria_configs', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->string('sigla', 30)->nullable();
            $table->string('timbrado_path')->nullable();
            $table->string('timbrado_mime', 50)->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'org_unit_id']);
        });

        // Último número emitido por secretaria/ano: a exclusão de uma ata nunca devolve o número.
        Schema::create('ata_numeracoes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->unsignedSmallInteger('ano');
            $table->unsignedInteger('ultimo')->default(0);
            $table->timestamps();
            $table->unique(['tenant_id', 'org_unit_id', 'ano']);
        });

        Schema::create('atas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units');
            $table->foreignId('tipo_id')->nullable()->constrained('ata_tipos')->nullOnDelete();
            $table->unsignedInteger('numero');
            $table->unsignedSmallInteger('ano');
            $table->string('titulo');
            $table->longText('conteudo_html')->nullable();
            $table->dateTime('data_reuniao');
            $table->string('local')->nullable();
            $table->string('cidade', 120)->nullable();
            $table->string('redator', 150);
            $table->boolean('sigilosa')->default(false);
            $table->string('status', 20)->default('em_redacao');
            $table->string('codigo_validacao', 40)->unique();
            $table->string('pdf_path')->nullable();
            $table->char('pdf_sha256', 64)->nullable();
            $table->foreignId('criado_por')->constrained('users');
            $table->foreignId('finalizada_por')->nullable()->constrained('users');
            $table->timestamp('rascunho_em')->nullable();
            $table->timestamp('finalizada_em')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'org_unit_id', 'ano', 'numero']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'created_at']);
        });

        Schema::create('ata_participantes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('ata_id')->constrained('atas')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->string('nome', 150);
            $table->string('cargo', 120)->nullable();
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->string('assinatura_path')->nullable();
            $table->timestamp('assinado_em')->nullable();
            $table->foreignId('assinatura_registrada_por')->nullable()->constrained('users');
            $table->timestamps();
            $table->index(['tenant_id', 'ata_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ata_participantes');
        Schema::dropIfExists('atas');
        Schema::dropIfExists('ata_numeracoes');
        Schema::dropIfExists('ata_secretaria_configs');
        Schema::dropIfExists('ata_tipos');
    }
};
