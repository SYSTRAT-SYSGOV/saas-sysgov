<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->date('periodo_inicio')->nullable()->after('servidor_id');
            $table->date('periodo_fim')->nullable()->after('periodo_inicio');
            $table->unsignedSmallInteger('dias_exercicio')->nullable()->after('periodo_fim');
            $table->foreignId('avaliacao_consolidada_id')
                ->nullable()
                ->after('dias_exercicio')
                ->constrained('capd_avaliacoes')
                ->nullOnDelete();
            $table->string('tipo_avaliacao', 20)->default('integral')->after('avaliacao_consolidada_id'); // integral | parcial | consolidada
            $table->string('status_avaliacao', 20)->default('ativa')->after('tipo_avaliacao'); // ativa | suspensa_licenca
        });

        // A avaliação "consolidada" de uma transferência de unidade não tem avaliador próprio.
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->foreignId('avaliador_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->foreignId('avaliador_id')->nullable(false)->change();
        });

        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('avaliacao_consolidada_id');
            $table->dropColumn(['periodo_inicio', 'periodo_fim', 'dias_exercicio', 'tipo_avaliacao', 'status_avaliacao']);
        });
    }
};
