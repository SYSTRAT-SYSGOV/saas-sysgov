<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_areas_protegidas', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('tipo', 20);
            $table->string('subtipo', 30)->nullable();
            $table->json('geometria');
            $table->string('ato_legal')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'tipo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_areas_protegidas');
    }
};
