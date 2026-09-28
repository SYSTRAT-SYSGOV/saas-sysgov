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
        Schema::create('cemetery_parks', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('nome');
            $table->string('endereco')->nullable();
            $table->string('tipo', 20)->default('municipal');
            $table->string('situacao', 10)->default('ativo');
            $table->string('responsavel')->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'codigo']);
            $table->index(['tenant_id', 'situacao']);
        });

        Schema::create('cemetery_sectors', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('park_id')->constrained('cemetery_parks')->cascadeOnDelete();
            $table->string('codigo', 30);
            $table->string('descricao')->nullable();
            $table->string('tipo_zona', 20);
            $table->decimal('area_m2', 12, 2)->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'park_id', 'codigo']);
        });

        Schema::create('plot_inventory', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('park_id')->constrained('cemetery_parks')->cascadeOnDelete();
            $table->foreignId('sector_id')->constrained('cemetery_sectors')->cascadeOnDelete();
            $table->string('codigo', 40);
            $table->string('tipo', 20);
            $table->unsignedTinyInteger('capacidade');
            $table->unsignedTinyInteger('ocupacao')->default(0);
            $table->string('estado', 20)->default('disponivel');
            $table->decimal('comprimento_m', 5, 2)->nullable();
            $table->decimal('largura_m', 5, 2)->nullable();
            $table->decimal('lat', 10, 7)->nullable();
            $table->decimal('lng', 10, 7)->nullable();
            $table->unsignedInteger('lock_version')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'park_id', 'codigo']);
            $table->index(['tenant_id', 'estado']);
            $table->index(['tenant_id', 'sector_id']);
        });

        Schema::create('plot_state_history', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plot_inventory')->cascadeOnDelete();
            $table->string('de', 20)->nullable();
            $table->string('para', 20);
            $table->string('motivo')->nullable();
            $table->string('origem', 20);
            $table->foreignId('autor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('ocorrido_em');

            $table->index(['tenant_id', 'plot_id', 'ocorrido_em']);
        });

        // Geometrias (ADR-001). O GeoJSON e a caixa delimitadora existem em qualquer banco;
        // a coluna espacial com índice só existe no MySQL, onde serve as consultas do mapa.
        Schema::create('cemetery_geometries', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('geometriavel_type', 10);
            $table->unsignedBigInteger('geometriavel_id');
            $table->longText('geojson');
            $table->decimal('min_lat', 10, 7);
            $table->decimal('min_lng', 10, 7);
            $table->decimal('max_lat', 10, 7);
            $table->decimal('max_lng', 10, 7);
            if (DB::getDriverName() === 'mysql') {
                $table->geometry('geom', 'polygon', 4326);
                $table->spatialIndex('geom');
            }
            $table->timestamps();

            $table->unique(['tenant_id', 'geometriavel_type', 'geometriavel_id'], 'cem_geom_owner_unique');
            $table->index(['tenant_id', 'geometriavel_type', 'min_lng', 'max_lng'], 'cem_geom_bbox_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cemetery_geometries');
        Schema::dropIfExists('plot_state_history');
        Schema::dropIfExists('plot_inventory');
        Schema::dropIfExists('cemetery_sectors');
        Schema::dropIfExists('cemetery_parks');
    }
};
