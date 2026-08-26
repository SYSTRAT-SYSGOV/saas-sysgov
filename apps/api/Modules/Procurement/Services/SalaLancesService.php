<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use Illuminate\Support\Facades\Redis;
use Modules\Procurement\Events\LanceRecebido;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoLance;
use Modules\Procurement\Models\LicitacaoParticipante;

final class SalaLancesService
{
    public function registrarLance(Licitacao $licitacao, LicitacaoParticipante $participante, int $valorCents): LicitacaoLance
    {
        // RN-013: Anti-spam via Redis
        $lockKey = "lance_lock:{$licitacao->id}:{$participante->id}";
        $isAllowed = Redis::set($lockKey, '1', ['ex' => 3, 'nx' => true]);

        if (!$isAllowed) {
            throw new \LogicException('Aguarde alguns segundos entre os lances.');
        }

        $ordem = $licitacao->lances()->count() + 1;

        $lance = LicitacaoLance::create([
            'licitacao_id' => $licitacao->id,
            'participante_id' => $participante->id,
            'valor_cents' => $valorCents,
            'ordem' => $ordem,
            'lancado_em' => now(),
        ]);

        broadcast(new LanceRecebido($lance));

        return $lance;
    }
}
