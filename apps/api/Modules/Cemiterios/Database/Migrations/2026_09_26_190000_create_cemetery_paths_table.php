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
        Schema::create('cemetery_paths', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('park_id')->constrained('cemetery_parks')->cascadeOnDelete();
            $table->string('via_codigo', 20);
            $table->longText('geojson');
            $table->decimal('min_lat', 10, 7);
            $table->decimal('min_lng', 10, 7);
            $table->decimal('max_lat', 10, 7);
            $table->decimal('max_lng', 10, 7);
            if (DB::getDriverName() === 'mysql') {
                $table->geometry('geom', 'linestring', 4326);
                $table->spatialIndex('geom');
            }
            $table->timestamps();

            $table->index(['tenant_id', 'park_id', 'min_lng', 'max_lng'], 'cem_paths_bbox_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_paths');
    }
};
