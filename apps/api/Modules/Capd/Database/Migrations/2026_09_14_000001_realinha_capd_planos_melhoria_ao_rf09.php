<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * RF-09: realinha capd_planos_melhoria ao schema literal do requisito.
 *
 * - conceito_atingido: gatilho de criação passa a ser o conceito da faixa
 *   (Regular/Insuficiente), não apenas o corte único de NFC.
 * - responsavel_id: quem executa as ações do plano.
 * - verificado_em/verificado_por: quando e quem registrou a verificação de
 *   evolução no ciclo de verificação (distinto de "concluido" — ações
 *   executadas pelo responsável, ainda sem reavaliação).
 * - status ganha o valor "verificado" e "pendente" é renomeado para "aberto"
 *   (aberto | em_andamento | concluido | verificado | cancelado — "cancelado"
 *   é extensão pragmática mantida do fluxo já existente de superseder PMDs).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('capd_planos_melhoria', function (Blueprint $table): void {
            $table->string('conceito_atingido', 30)->nullable()->after('nfc_gatilho');
            $table->unsignedBigInteger('responsavel_id')->nullable()->after('servidor_id');
            $table->timestamp('verificado_em')->nullable()->after('concluido_em');
            $table->unsignedBigInteger('verificado_por')->nullable()->after('verificado_em');

            $table->foreign('responsavel_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('verificado_por')->references('id')->on('users')->nullOnDelete();
        });

        DB::table('capd_planos_melhoria')->where('status', 'pendente')->update(['status' => 'aberto']);
    }

    public function down(): void
    {
        DB::table('capd_planos_melhoria')->where('status', 'aberto')->update(['status' => 'pendente']);

        Schema::table('capd_planos_melhoria', function (Blueprint $table): void {
            $table->dropForeign(['responsavel_id']);
            $table->dropForeign(['verificado_por']);
            $table->dropColumn(['conceito_atingido', 'responsavel_id', 'verificado_em', 'verificado_por']);
        });
    }
};
