<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_documentos_licenciamento', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_licenciamento_id')->constrained('meio_ambiente_processos_licenciamento')->cascadeOnDelete();
            $table->string('tipo', 30);
            $table->string('caminho_arquivo')->nullable();
            $table->timestamp('anexado_em');
            $table->timestamps();

            $table->index(['tenant_id', 'processo_licenciamento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_documentos_licenciamento');
    }
};
