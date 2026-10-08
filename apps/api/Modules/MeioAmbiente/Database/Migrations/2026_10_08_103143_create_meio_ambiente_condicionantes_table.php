<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_condicionantes', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('processo_licenciamento_id')->constrained('meio_ambiente_processos_licenciamento')->cascadeOnDelete();
            $table->string('descricao');
            $table->date('prazo');
            $table->string('situacao', 15)->default('pendente');
            $table->timestamp('cumprida_em')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'processo_licenciamento_id']);
            $table->index(['tenant_id', 'situacao', 'prazo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_condicionantes');
    }
};
