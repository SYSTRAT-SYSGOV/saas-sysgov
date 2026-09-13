<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->boolean('devolutiva_realizada')->default(false)->after('ciencia_servidor_em');
            $table->dateTime('devolutiva_em')->nullable()->after('devolutiva_realizada');
            $table->text('devolutiva_resumo')->nullable()->after('devolutiva_em');
            $table->text('devolutiva_acordos')->nullable()->after('devolutiva_resumo');
            $table->foreignId('devolutiva_por')->nullable()->constrained('users')->after('devolutiva_acordos');
            $table->string('ciencia_ip', 45)->nullable()->after('devolutiva_por');
            $table->string('ciencia_tipo', 30)->nullable()->after('ciencia_ip');
            $table->text('parecer_avaliador')->nullable()->after('ciencia_tipo');
        });
    }

    public function down(): void
    {
        Schema::table('capd_avaliacoes', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('devolutiva_por');
            $table->dropColumn([
                'devolutiva_realizada',
                'devolutiva_em',
                'devolutiva_resumo',
                'devolutiva_acordos',
                'ciencia_ip',
                'ciencia_tipo',
                'parecer_avaliador',
            ]);
        });
    }
};
