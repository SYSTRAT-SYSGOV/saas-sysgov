<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->renameColumn('cpf', 'documento');
            $table->renameColumn('cpf_hash', 'documento_hash');
        });
    }

    public function down(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->renameColumn('documento', 'cpf');
            $table->renameColumn('documento_hash', 'cpf_hash');
        });
    }
};
