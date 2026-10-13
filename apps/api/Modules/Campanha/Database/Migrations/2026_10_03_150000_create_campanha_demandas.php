<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Demandas da campanha por município, com responsável entre os membros e histórico (D7). */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campanha_demandas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campanha_id')->constrained('campanha_campanhas')->cascadeOnDelete();
            $table->unsignedInteger('codigo_ibge');
            $table->string('solicitante', 200);
            $table->foreignId('eleitor_id')->nullable()->constrained('campanha_eleitores')->nullOnDelete();
            $table->string('categoria', 30);
            $table->string('prioridade', 10)->default('media');
            $table->foreignId('responsavel_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('prazo')->nullable();
            $table->string('status', 20)->default('pendente');
            $table->text('descricao');
            $table->json('historico')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'campanha_id', 'status']);
            $table->index(['tenant_id', 'campanha_id', 'codigo_ibge']);
            $table->index(['tenant_id', 'campanha_id', 'responsavel_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campanha_demandas');
    }
};
