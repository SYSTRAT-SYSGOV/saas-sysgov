<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Jobs;

use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\Requerimentos\Events\PrazoProximo;
use Modules\Requerimentos\Events\PrazoVencido;
use Modules\Requerimentos\Models\TramitacaoPoderes;

final class VerificarPrazosJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(): void
    {
        $hoje = Carbon::today();
        $alertaProximo = Carbon::today()->addDays(5);

        // Verifica tramitações com prazo próximo (5 dias)
        $tramitacoesProximas = TramitacaoPoderes::where('status', TramitacaoPoderes::STATUS_RECEBIDO)
            ->whereDate('data_limite_resposta', '<=', $alertaProximo)
            ->whereDate('data_limite_resposta', '>', $hoje)
            ->get();

        foreach ($tramitacoesProximas as $tramitacao) {
            $diasRestantes = (int) Carbon::parse($tramitacao->data_limite_resposta)->diffInDays($hoje);
            event(new PrazoProximo($tramitacao, $diasRestantes));
        }

        // Verifica tramitações vencidas
        $tramitacoesVencidas = TramitacaoPoderes::whereIn('status', [
            TramitacaoPoderes::STATUS_ENCAMINHADO,
            TramitacaoPoderes::STATUS_RECEBIDO,
        ])
        ->whereDate('data_limite_resposta', '<', $hoje)
        ->get();

        foreach ($tramitacoesVencidas as $tramitacao) {
            $tramitacao->update(['status' => TramitacaoPoderes::STATUS_VENCIDO]);
            $tramitacao->proposicao->update(['status' => \Modules\Requerimentos\Models\Proposicao::STATUS_VENCIDO]);
            event(new PrazoVencido($tramitacao));
        }
    }
}