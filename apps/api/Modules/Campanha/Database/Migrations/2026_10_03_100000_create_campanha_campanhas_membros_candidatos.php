<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Campanhas por candidato (D2): o tenant tem N campanhas; cada uma com um candidato (Pessoa pelo
 * CPF — D8), seus membros (usuários do tenant) e a configuração de cores e faixas de meta (D11).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_campanhas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->unsignedSmallInteger('ano');
            $table->string('cargo', 100);
            $table->char('uf', 2);
            $table->unsignedInteger('meta_votos_global')->default(0);
            $table->string('status', 20)->default('ativa');
            $table->json('cores_situacao')->nullable();
            $table->json('faixas_meta')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'ano']);
        });

        Schema::create('campanha_membros', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'campanha_id', 'user_id']);
            $table->index(['tenant_id', 'user_id']);
        });

        Schema::create('campanha_candidatos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedBigInteger('pessoa_id');
            $table->string('nome_urna', 200);
            $table->string('partido', 50)->nullable();
            $table->string('numero', 15)->nullable();
            $table->string('coligacao', 255)->nullable();
            $table->string('telefone', 20)->nullable();
            $table->string('whatsapp', 20)->nullable();
            $table->string('email', 150)->nullable();
            $table->string('instagram', 100)->nullable();
            $table->string('facebook', 100)->nullable();
            $table->string('tiktok', 100)->nullable();
            $table->string('youtube', 100)->nullable();
            $table->string('site', 255)->nullable();
            $table->text('biografia')->nullable();
            $table->unsignedInteger('votos_ultima_eleicao')->nullable();
            $table->string('cargo_ultima_eleicao', 100)->nullable();
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'campanha_id']);
            $table->index(['tenant_id', 'pessoa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_candidatos');
        Schema::dropIfExists('campanha_membros');
        Schema::dropIfExists('campanha_campanhas');
    }
};
