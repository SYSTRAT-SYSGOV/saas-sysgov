<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_processos_licenciamento', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained('meio_ambiente_empreendimentos')->cascadeOnDelete();
            $table->string('fase', 15);
            $table->string('numero', 30);
            $table->unsignedInteger('numero_sequencial');
            $table->unsignedSmallInteger('exercicio');
            $table->string('status', 15)->default('em_analise');
            $table->date('data_deferimento')->nullable();
            $table->date('validade_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'empreendimento_id'], 'ma_processos_licenciamento_empreendimento_idx');
            $table->index(['tenant_id', 'status', 'validade_em'], 'ma_processos_licenciamento_status_validade_em_idx');
            $table->unique(['tenant_id', 'fase', 'exercicio', 'numero_sequencial'], 'ma_processos_licenciamento_fase_exercicio_numero_sequencial_unq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_processos_licenciamento');
    }
};
