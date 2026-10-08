<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('meio_ambiente_contadores', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('chave', 50);
            $table->unsignedSmallInteger('exercicio');
            $table->unsignedInteger('valor')->default(0);
            $table->timestamps();

            $table->unique(['tenant_id', 'chave', 'exercicio']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('meio_ambiente_contadores');
    }
};
