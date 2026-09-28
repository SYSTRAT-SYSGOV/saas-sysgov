<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_inspections', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->foreignId('vistoriador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('data');
            $table->string('estado_conservacao', 20); // bom | regular | ruim | em_ruina | indicio_abandono
            $table->string('risco', 10); // baixo | medio | alto
            $table->text('observacoes')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'plot_id', 'data']);
        });

        Schema::create('cemetery_inspection_photos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('inspection_id')->constrained('cemetery_inspections')->cascadeOnDelete();
            $table->string('arquivo');
            $table->dateTime('capturada_em');
            $table->timestamps();
        });

        Schema::create('cemetery_abandonment_processes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->foreignId('concession_id')->constrained('concessions')->cascadeOnDelete();
            $table->foreignId('inspection_id')->constrained('cemetery_inspections')->cascadeOnDelete();
            $table->date('instaurado_em');
            $table->date('edital_publicado_em')->nullable();
            $table->unsignedSmallInteger('prazo_dias_aplicado')->nullable();
            $table->date('prazo_fim')->nullable();
            $table->text('manifestacao')->nullable();
            $table->string('situacao', 20)->default('instaurado'); // instaurado | em_edital | arquivado | decidido
            $table->text('decisao')->nullable();
            $table->boolean('remocao_pendente')->default(false);
            $table->foreignId('demolicao_order_id')->nullable()->constrained('cemetery_service_orders')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'situacao']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_abandonment_processes');
        Schema::dropIfExists('cemetery_inspection_photos');
        Schema::dropIfExists('cemetery_inspections');
    }
};
