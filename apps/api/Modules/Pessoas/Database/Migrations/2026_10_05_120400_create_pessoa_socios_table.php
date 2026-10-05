<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pessoa_socios', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->foreignId('socio_pessoa_id')->constrained('pessoas')->cascadeOnDelete();
            $table->decimal('percentual_participacao', 5, 2)->nullable();
            $table->string('papel', 30)->default('socio');
            $table->date('data_entrada')->nullable();
            $table->date('data_saida')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'pessoa_id']);
            $table->index(['tenant_id', 'socio_pessoa_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pessoa_socios');
    }
};
