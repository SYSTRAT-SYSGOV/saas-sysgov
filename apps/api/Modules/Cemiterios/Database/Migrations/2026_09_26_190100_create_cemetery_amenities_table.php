<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cemetery_amenities', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('park_id')->constrained('cemetery_parks')->cascadeOnDelete();
            $table->string('tipo', 20); // portaria | capela | sanitario | administracao | agua | vegetacao
            $table->string('rotulo', 60)->nullable();
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            if (DB::getDriverName() === 'mysql') {
                $table->geometry('geom', 'point', 4326);
                $table->spatialIndex('geom');
            }
            $table->timestamps();

            $table->index(['tenant_id', 'park_id', 'tipo'], 'cem_amenities_park_tipo_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_amenities');
    }
};
