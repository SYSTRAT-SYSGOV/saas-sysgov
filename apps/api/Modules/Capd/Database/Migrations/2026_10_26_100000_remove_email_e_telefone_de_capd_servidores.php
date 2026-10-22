<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Modules\Pessoas\Services\TravaRemocaoColunasService;

/**
 * Fase 5, task 2.3 do Capd (unificar-pessoas-fase-5-remocao-colunas): o servidor deixa de guardar `email` e `telefone`
 * (vivem como contatos da pessoa do cadastro central) e o usuário se liga a ele por `user_id` e pelo vínculo
 * `pessoas_usuarios`, não mais pelo e-mail.
 *
 * Antes de remover, o que o servidor tem e a pessoa ainda não tem vira contato principal da pessoa, para nada se
 * perder. Se a pessoa já tem contato do tipo, o dela prevalece e o do servidor (cópia antiga) é descartado.
 *
 * DESTRUTIVA. Só roda com a trava liberada (todo servidor com pessoa e nenhuma divergência aberta, em todos os
 * tenants) e depois de um backup verificado. O `down()` só recria as colunas vazias: o que não foi copiado para a
 * pessoa existe apenas no backup.
 */
return new class extends Migration
{
    public function up(): void
    {
        app(TravaRemocaoColunasService::class)->exigir('capd');

        foreach (['email', 'telefone'] as $tipo) {
            $coluna = $tipo; // o tipo do contato tem o nome da coluna
            DB::table('capd_servidores')
                ->whereNotNull($coluna)
                ->where($coluna, '!=', '')
                ->whereNotNull('pessoa_id')
                ->orderBy('id')
                ->each(function (object $servidor) use ($coluna, $tipo): void {
                    $jaTem = DB::table('pessoas_contatos')->where('pessoa_id', $servidor->pessoa_id)->where('tipo', $tipo)->exists();
                    if ($jaTem) {
                        return;
                    }

                    DB::table('pessoas_contatos')->insert([
                        'tenant_id' => $servidor->tenant_id,
                        'pessoa_id' => $servidor->pessoa_id,
                        'tipo' => $tipo,
                        'valor' => $tipo === 'email' ? mb_strtolower(trim((string) $servidor->{$coluna})) : trim((string) $servidor->{$coluna}),
                        'principal' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
        }

        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->dropColumn(['email', 'telefone']);
        });
    }

    public function down(): void
    {
        Schema::table('capd_servidores', function (Blueprint $table): void {
            $table->string('email', 100)->nullable();
            $table->string('telefone', 25)->nullable();
        });
    }
};
