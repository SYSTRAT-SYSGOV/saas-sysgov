<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('rh_colaboradores')) {
            Schema::create('rh_colaboradores', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
                $table->string('matricula')->nullable();
                $table->string('cargo')->nullable();
                $table->string('status')->default('ativo');
                $table->timestamps();
                $table->index(['tenant_id', 'pessoa_id']);
            });
        }

        if (! Schema::hasTable('protocolo_requerimentos')) {
            Schema::create('protocolo_requerimentos', function (Blueprint $table): void {
                $table->id();
                $table->foreignId('tenant_id')->constrained()->cascadeOnDelete();
                $table->foreignId('pessoa_id')->nullable()->constrained('pessoas')->nullOnDelete();
                $table->string('numero_protocolo')->nullable();
                $table->string('assunto')->nullable();
                $table->string('status')->default('aberto');
                $table->timestamps();
                $table->index(['tenant_id', 'pessoa_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('protocolo_requerimentos');
        Schema::dropIfExists('rh_colaboradores');
    }
};
