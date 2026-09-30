<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoas_vinculos', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->string('tipo_vinculo', 30);
            $table->json('dados')->nullable();
            $table->date('inicio')->nullable();
            $table->date('fim')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'pessoa_id']);
            $table->index(['tenant_id', 'tipo_vinculo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoas_vinculos');
    }
};
