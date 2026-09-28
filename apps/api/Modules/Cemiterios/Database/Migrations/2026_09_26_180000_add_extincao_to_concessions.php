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
                $col = $table->string('motivo_extincao', 20)->nullable(); // renuncia | abandono
                if (Schema::hasColumn('concessions', 'estado')) {
                    $col->after('estado');
                } elseif (Schema::hasColumn('concessions', 'situacao')) {
                    $col->after('situacao');
                }
            }
            if (!Schema::hasColumn('concessions', 'extinta_em')) {
                $table->date('extinta_em')->nullable();
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
