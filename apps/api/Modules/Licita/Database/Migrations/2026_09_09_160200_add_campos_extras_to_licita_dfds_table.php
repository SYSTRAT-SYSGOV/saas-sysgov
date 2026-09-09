<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('licita_dfds', function (Blueprint $table): void {
            $table->json('campos_extras')->nullable()->after('equipe_planejamento');
        });
    }

    public function down(): void
    {
        Schema::table('licita_dfds', function (Blueprint $table): void {
            $table->dropColumn('campos_extras');
        });
    }
};
