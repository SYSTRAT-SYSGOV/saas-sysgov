<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas_vinculos', function (Blueprint $table): void {
            $table->string('matricula', 50)->nullable()->after('tipo_vinculo');
        });
    }

    public function down(): void
    {
        Schema::table('pessoas_vinculos', function (Blueprint $table): void {
            $table->dropColumn('matricula');
        });
    }
};
