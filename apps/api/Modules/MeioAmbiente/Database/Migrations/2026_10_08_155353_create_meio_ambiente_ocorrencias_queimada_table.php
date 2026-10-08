<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_ocorrencias_queimada', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->date('data_ocorrencia');
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->decimal('area_queimada_ha', 10, 2)->nullable();
            $table->foreignId('responsavel_pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
            $table->foreignId('responsavel_empreendimento_id')->nullable()->constrained('meio_ambiente_empreendimentos')->nullOnDelete();
            $table->foreignId('auto_infracao_ambiental_id')->nullable()->constrained('meio_ambiente_autos_infracao')->nullOnDelete();
            $table->string('situacao', 30);
            $table->json('referencia_imagem_satelite')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_ocorrencias_queimada');
    }
};
