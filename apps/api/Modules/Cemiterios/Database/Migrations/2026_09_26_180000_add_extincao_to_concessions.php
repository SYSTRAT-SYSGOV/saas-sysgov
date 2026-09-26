<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('concessions', function (Blueprint $table): void {
            if (!Schema::hasColumn('concessions', 'motivo_extincao')) {
                $table->string('motivo_extincao', 20)->nullable()->after('situacao'); // renuncia | abandono
            }
            if (!Schema::hasColumn('concessions', 'extinta_em')) {
                $table->date('extinta_em')->nullable()->after('motivo_extincao');
            }
        });
    }

    public function down(): void
    {
        Schema::table('concessions', function (Blueprint $table): void {
            if (Schema::hasColumn('concessions', 'extinta_em')) {
                $table->dropColumn('extinta_em');
            }
            if (Schema::hasColumn('concessions', 'motivo_extincao')) {
                $table->dropColumn('motivo_extincao');
            }
        });
    }
};
