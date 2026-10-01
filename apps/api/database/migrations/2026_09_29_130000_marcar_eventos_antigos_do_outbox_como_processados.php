<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Política do primeiro processamento (design, seção Migration Plan): antes desta mudança,
 * `outbox:process` nunca rodava agendado (tarefa 1.2), então eventos pendentes desde as Fases 1
 * e 2 (inscrições, certificados, recuperações de senha antigas) se acumularam em `outbox_events`
 * sem nunca serem tentados. Quando o `scheduler` sobe pela primeira vez em produção, ele
 * processaria tudo de uma vez — inclusive enviando e-mail de pedidos de redefinição de senha de
 * meses atrás. Esta migration roda uma única vez, no deploy desta mudança, e marca os eventos já
 * vencidos como `done` sem processar; só eventos publicados depois dela chegam ao consumidor.
 */
return new class extends Migration {
    public function up(): void
    {
        DB::table('outbox_events')
            ->where('status', 'pending')
            ->where('available_at', '<=', now())
            ->update(['status' => 'done', 'processed_at' => now()]);
    }

    /**
     * Não reversível: depois de marcar os eventos como `done`, não há como saber quais estavam
     * `pending` antes — reprocessá-los de volta enviaria os e-mails atrasados que esta migration
     * existe justamente para evitar.
     */
    public function down(): void {}
};
