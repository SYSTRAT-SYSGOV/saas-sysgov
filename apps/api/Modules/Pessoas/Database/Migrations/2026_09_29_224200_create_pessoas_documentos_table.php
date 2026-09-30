<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas_documentos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->string('numero');
            $table->string('orgao_emissor')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'pessoa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas_documentos');
    }
};
