<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemetery_parks', function (Blueprint $table): void {
            if (!Schema::hasColumn('cemetery_parks', 'portaria_lat')) {
                $table->decimal('portaria_lat', 10, 7)->nullable()->after('lng');
            }
            if (!Schema::hasColumn('cemetery_parks', 'portaria_lng')) {
                $table->decimal('portaria_lng', 10, 7)->nullable()->after('portaria_lat');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_parks', function (Blueprint $table): void {
            if (Schema::hasColumn('cemetery_parks', 'portaria_lng')) {
                $table->dropColumn('portaria_lng');
            }
            if (Schema::hasColumn('cemetery_parks', 'portaria_lat')) {
                $table->dropColumn('portaria_lat');
            }
        });
    }
};
