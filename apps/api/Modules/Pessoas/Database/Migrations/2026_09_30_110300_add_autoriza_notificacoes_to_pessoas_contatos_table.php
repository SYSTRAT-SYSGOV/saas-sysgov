<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas_contatos', function (Blueprint $table): void {
            $table->boolean('autoriza_notificacoes')->default(true)->after('principal');
        });
    }

    public function down(): void
    {
        Schema::table('pessoas_contatos', function (Blueprint $table): void {
            $table->dropColumn('autoriza_notificacoes');
        });
    }
};
