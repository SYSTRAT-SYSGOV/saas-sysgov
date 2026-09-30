<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pessoas_documentos', function (Blueprint $table): void {
            $table->string('uf_emissao', 2)->nullable()->after('orgao_emissor');
            $table->date('data_emissao')->nullable()->after('uf_emissao');
        });
    }

    public function down(): void
    {
        Schema::table('pessoas_documentos', function (Blueprint $table): void {
            $table->dropColumn(['uf_emissao', 'data_emissao']);
        });
    }
};
