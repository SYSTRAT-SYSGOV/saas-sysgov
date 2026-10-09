<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_alertas_licenciamento', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_licenciamento_id')->constrained('meio_ambiente_processos_licenciamento', 'id', 'ma_alertas_licenciamento_processo_licenciamento_fk')->cascadeOnDelete();
            $table->unsignedSmallInteger('dias_para_vencimento');
            $table->timestamp('gerado_em');
            $table->timestamps();

            $table->unique(['tenant_id', 'processo_licenciamento_id', 'dias_para_vencimento'], 'ma_alertas_licenc_processo_dias_unq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_alertas_licenciamento');
    }
};
