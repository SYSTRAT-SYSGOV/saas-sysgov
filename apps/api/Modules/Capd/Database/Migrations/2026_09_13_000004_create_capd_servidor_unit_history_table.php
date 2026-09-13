<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('capd_servidor_unit_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('servidor_id')->constrained('capd_servidores')->cascadeOnDelete();
            $table->foreignId('org_unit_id')->constrained('org_units')->cascadeOnDelete();
            $table->date('valido_de');
            $table->date('valido_ate')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'servidor_id']);
            $table->index(['tenant_id', 'org_unit_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('capd_servidor_unit_history');
    }
};
