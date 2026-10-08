<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_compensacoes_ambientais', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained('meio_ambiente_empreendimentos')->cascadeOnDelete();
            $table->foreignId('processo_licenciamento_id')->constrained('meio_ambiente_processos_licenciamento')->cascadeOnDelete();
            $table->decimal('percentual', 5, 2);
            $table->unsignedBigInteger('valor_devido_centavos');
            $table->timestamps();

            $table->unique(['tenant_id', 'processo_licenciamento_id']);
            $table->index(['tenant_id', 'empreendimento_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_compensacoes_ambientais');
    }
};
