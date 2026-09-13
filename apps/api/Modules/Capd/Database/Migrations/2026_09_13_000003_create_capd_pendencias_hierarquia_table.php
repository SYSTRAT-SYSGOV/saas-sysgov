<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_pendencias_hierarquia', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('servidor_id')->constrained('capd_servidores')->cascadeOnDelete();
            $table->foreignId('ciclo_id')->nullable()->constrained('capd_ciclos')->nullOnDelete();
            $table->string('tipo_pendencia', 40); // sem_superior | afastamento_sem_substituto | topo_sem_config
            $table->text('motivo');
            $table->string('status', 15)->default('aberta'); // aberta | resolvida
            $table->foreignId('avaliador_designado_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('resolvido_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolvido_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'servidor_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_pendencias_hierarquia');
    }
};
