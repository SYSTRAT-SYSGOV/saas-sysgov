<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_legacy_sublot_occupancy', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('sublot_id')->constrained('cemetery_legacy_sublots')->cascadeOnDelete();
            $table->string('origem', 30)->default('OBA.DBF');
            $table->timestamps();

            $table->unique(['tenant_id', 'sublot_id'], 'clso_tenant_sublot_uq');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_legacy_sublot_occupancy');
    }
};
