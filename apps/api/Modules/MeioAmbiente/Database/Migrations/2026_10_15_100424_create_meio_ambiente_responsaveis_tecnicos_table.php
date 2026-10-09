<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_responsaveis_tecnicos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('empreendimento_id')->constrained('meio_ambiente_empreendimentos')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->string('nome');
            $table->string('registro_profissional');
            $table->string('tipo_registro', 10);
            $table->timestamps();

            $table->unique(['tenant_id', 'empreendimento_id'], 'ma_responsaveis_tecnicos_empreendimento_unq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_responsaveis_tecnicos');
    }
};
