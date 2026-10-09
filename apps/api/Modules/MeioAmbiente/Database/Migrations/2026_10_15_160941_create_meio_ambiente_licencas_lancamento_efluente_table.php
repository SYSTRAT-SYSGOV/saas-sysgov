<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_licencas_lancamento_efluente', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained('meio_ambiente_empreendimentos', 'id', 'ma_licencas_lancamento_efluente_empreendimento_fk')->cascadeOnDelete();
            $table->date('validade_em');
            $table->timestamps();

            $table->index(['tenant_id', 'empreendimento_id'], 'ma_licencas_lancamento_efluente_empreendimento_idx');
            $table->index(['tenant_id', 'validade_em'], 'ma_licencas_lancamento_efluente_validade_em_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_licencas_lancamento_efluente');
    }
};
