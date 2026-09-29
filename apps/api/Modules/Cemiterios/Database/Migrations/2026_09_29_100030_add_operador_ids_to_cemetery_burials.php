<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cemetery_burials', function (Blueprint $table): void {
            $table->foreignId('coveiro_id')->nullable()->after('coveiro_nome')->constrained('cemetery_operators')->nullOnDelete();
            $table->foreignId('pedreiro_id')->nullable()->after('pedreiro_nome')->constrained('cemetery_operators')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('cemetery_burials', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('coveiro_id');
            $table->dropConstrainedForeignId('pedreiro_id');
        });
    }
};
