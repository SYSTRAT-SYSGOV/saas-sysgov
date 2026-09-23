<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Portal público/concessionário ligado por município (spec: portal › Identificação do município).
        Schema::table('cemetery_settings', function (Blueprint $table): void {
            $table->boolean('portal_habilitado')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_settings', function (Blueprint $table): void {
            $table->dropColumn('portal_habilitado');
        });
    }
};
