<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vistoria_assinaturas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('documento_id')->constrained('vistoria_documentos')->cascadeOnDelete();
            $table->foreignId('testemunha_pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->uuid('client_uuid');
            $table->string('papel', 20); // autuado, responsavel, testemunha
            $table->string('status', 20); // assinada, recusada
            $table->json('tracado_vetorial')->nullable()->comment('Pontos capturados do traçado (null quando recusada)');
            $table->string('imagem_path', 255)->nullable()->comment('PNG rasterizado (null quando recusada)');
            $table->string('hash_sha256', 64)->nullable();
            $table->text('motivo_recusa')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->timestamp('coletado_em_dispositivo')->nullable();
            $table->timestamp('assinado_em')->nullable()->comment('Timestamp oficial — autoridade do servidor, não do dispositivo');
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'client_uuid'], 'vistoria_assinatura_client_uuid_unq');
            $table->index(['tenant_id', 'documento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vistoria_assinaturas');
    }
};
