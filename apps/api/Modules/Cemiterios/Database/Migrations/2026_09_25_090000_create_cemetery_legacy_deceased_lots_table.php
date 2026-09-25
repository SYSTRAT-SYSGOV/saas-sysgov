<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_legacy_deceased_lots', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('park_id')->constrained('cemetery_parks')->cascadeOnDelete();
            $table->string('quadra_legado', 10);
            $table->string('lote_legado', 10);
            $table->string('origem', 30)->default('FALECIDO.DBF');
            $table->timestamps();

            $table->unique(['tenant_id', 'park_id', 'quadra_legado', 'lote_legado'], 'cldl_tenant_park_quadra_lote_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_legacy_deceased_lots');
    }
};
