<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas_contatos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->string('valor');
            $table->boolean('principal')->default(false);
            $table->timestamps();

            $table->index(['tenant_id', 'pessoa_id']);
            $table->index(['pessoa_id', 'tipo', 'principal']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas_contatos');
    }
};
