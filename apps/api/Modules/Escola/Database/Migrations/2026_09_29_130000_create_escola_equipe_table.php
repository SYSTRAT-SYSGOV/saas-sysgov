<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Equipe gestora cadastrada por nome (design D17): diretor, diretores auxiliares, secretaria e pedagogas. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('escola_equipe', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('nome', 200);
            $table->string('cargo', 20);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'cargo']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('escola_equipe');
    }
};
