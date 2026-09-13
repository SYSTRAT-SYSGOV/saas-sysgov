<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->foreignId('org_unit_id')
                ->nullable()
                ->after('lotacao_fisica')
                ->constrained('org_units')
                ->nullOnDelete();

            $table->index(['tenant_id', 'org_unit_id']);
        });
    }

    public function down(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('org_unit_id');
        });
    }
};
