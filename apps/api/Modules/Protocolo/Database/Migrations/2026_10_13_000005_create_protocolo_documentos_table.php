<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('protocolo_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_id')->constrained('protocolo_processos')->cascadeOnDelete();
            $table->string('tipo_documento', 64);
            $table->string('nome_arquivo', 255);
            $table->string('caminho_arquivo', 500);
            $table->char('hash_arquivo', 64);
            $table->unsignedBigInteger('tamanho_bytes');
            $table->string('mime_type', 120)->nullable();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->softDeletes();
            $table->timestamps();

            $table->index(['tenant_id', 'processo_id']);
            $table->index(['tenant_id', 'hash_arquivo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_documentos');
    }
};
