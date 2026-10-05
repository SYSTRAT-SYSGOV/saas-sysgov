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
            $table->string('razao_social')->nullable()->after('nome');
            $table->string('nome_fantasia')->nullable()->after('razao_social');
            $table->string('inscricao_estadual', 30)->nullable()->after('nome_fantasia');
            $table->string('inscricao_municipal', 30)->nullable()->after('inscricao_estadual');
            $table->string('porte', 20)->nullable()->after('inscricao_municipal');
            $table->string('natureza_juridica', 100)->nullable()->after('porte');
            $table->foreignId('responsavel_id')->nullable()->after('natureza_juridica')
                ->constrained('pessoas')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('pessoas', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('responsavel_id');
            $table->dropColumn([
                'razao_social',
                'nome_fantasia',
                'inscricao_estadual',
                'inscricao_municipal',
                'porte',
                'natureza_juridica',
            ]);
        });
    }
};
