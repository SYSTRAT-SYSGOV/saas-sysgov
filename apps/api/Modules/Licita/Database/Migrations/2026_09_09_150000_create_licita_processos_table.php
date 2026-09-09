<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('licita_processos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('numero');
            $table->smallInteger('ano');
            $table->string('objeto', 500)->nullable();
            $table->string('fase_atual')->default('dfd');
            $table->string('status_geral')->default('em_andamento');
            $table->foreignId('licitacao_id')->nullable()->constrained('licitacoes')->nullOnDelete();
            $table->foreignId('criado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'numero', 'ano']);
            $table->index(['tenant_id', 'fase_atual', 'status_geral']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('licita_processos');
    }
};
