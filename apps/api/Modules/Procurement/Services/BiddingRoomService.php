<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use DomainException;
use Illuminate\Support\Facades\Cache;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoLance;
use Modules\Procurement\Models\LicitacaoParticipante;

final class BiddingRoomService
{
    /**
     * Registra um novo lance na sala de disputa com controle anti-spam via Redis (RN-013)
     */
    public function placeBid(
        Licitacao $licitacao,
        LicitacaoParticipante $participante,
        int $valorCents,
        ?string $ip = null
    ): LicitacaoLance {
        if (!in_array($licitacao->status, ['em_disputa', 'publicada'], true)) {
            throw new DomainException('A sala de lances não está aberta para disputa neste processo.');
        }

        if ($participante->licitacao_id !== $licitacao->id) {
            throw new DomainException('O participante informado não pertence a este processo licitatório.');
        }

        if (!in_array($participante->status, ['credenciado', 'classificado', 'habilitado'], true)) {
            throw new DomainException('O participante não está habilitado para ofertar lances.');
        }

        // RN-013: Anti-spam de lances no Redis (rejeição em intervalo < X segundos)
        $antiSpamSeconds = (int) config('procurement.bidding_anti_spam_seconds', 3);
        $spamCacheKey = "bidding:antispam:tenant_{$licitacao->tenant_id}:proc_{$licitacao->id}:part_{$participante->id}";

        if (Cache::has($spamCacheKey)) {
            $ttl = Cache::get($spamCacheKey);
            throw new DomainException("RN-013 Anti-Spam: Aguarde {$antiSpamSeconds} segundos entre envios sucessivos de lances.");
        }

        // Validar se o lance é inferior ao melhor lance atual
        $bestBid = LicitacaoLance::query()
            ->where('licitacao_id', $licitacao->id)
            ->orderBy('valor_cents', 'asc')
            ->first();

        if ($bestBid && $valorCents >= $bestBid->valor_cents) {
            throw new DomainException('O lance ofertado deve ser estritamente inferior ao menor lance registrado atualmente.');
        }

        if (!$bestBid && $licitacao->valor_estimado_cents > 0 && $valorCents > $licitacao->valor_estimado_cents) {
            throw new DomainException('O lance inicial não pode ser superior ao valor estimado do processo licitatório.');
        }

        // Próximo número de ordem
        $nextOrder = (int) (LicitacaoLance::query()->where('licitacao_id', $licitacao->id)->max('ordem') ?? 0) + 1;

        $lance = LicitacaoLance::create([
            'tenant_id' => $licitacao->tenant_id,
            'licitacao_id' => $licitacao->id,
            'participante_id' => $participante->id,
            'valor_cents' => $valorCents,
            'ordem' => $nextOrder,
            'lancado_em' => now(),
            'ip_address' => $ip,
        ]);

        // Registrar lock anti-spam no Redis
        Cache::put($spamCacheKey, time(), now()->addSeconds($antiSpamSeconds));

        return $lance;
    }

    /**
     * Retorna o ranking atualizado e verificação de empate ficto ME/EPP
     */
    public function getLiveRanking(Licitacao $licitacao): array
    {
        $bids = LicitacaoLance::query()
            ->where('licitacao_id', $licitacao->id)
            ->with('participante')
            ->orderBy('valor_cents', 'asc')
            ->get();

        // Agrupar por participante e pegar o melhor lance de cada um
        $rankedParticipants = [];
        $seen = [];

        foreach ($bids as $bid) {
            $partId = $bid->participante_id;
            if (!isset($seen[$partId])) {
                $seen[$partId] = true;
                $rankedParticipants[] = [
                    'participante_id' => $partId,
                    'razao_social' => $bid->participante->razao_social,
                    'cnpj' => $bid->participante->cnpj,
                    'porte_me_epp' => $bid->participante->porte_me_epp,
                    'melhor_lance_cents' => $bid->valor_cents,
                    'lancado_em' => $bid->lancado_em->toIso8601String(),
                ];
            }
        }

        // Verificar empate ficto ME/EPP (Lei Complementar 123/2006 e Lei 14.133/2021)
        // Intervalo de até 5% (pregão) ou 10% (outras modalidades)
        $meEppEligibleForPreference = [];
        if (count($rankedParticipants) > 1) {
            $first = $rankedParticipants[0];
            $isFirstMeEpp = $first['porte_me_epp'];

            if (!$isFirstMeEpp) {
                $marginPercent = ($licitacao->modalidade === 'pregao_eletronico') ? 0.05 : 0.10;
                $maxAcceptableCents = (int) ($first['melhor_lance_cents'] * (1 + $marginPercent));

                foreach (array_slice($rankedParticipants, 1) as $candidate) {
                    if ($candidate['porte_me_epp'] && $candidate['melhor_lance_cents'] <= $maxAcceptableCents) {
                        $meEppEligibleForPreference[] = $candidate;
                    }
                }
            }
        }

        return [
            'total_lances' => $bids->count(),
            'melhor_lance_cents' => $rankedParticipants[0]['melhor_lance_cents'] ?? null,
            'lider' => $rankedParticipants[0] ?? null,
            'ranking' => $rankedParticipants,
            'empate_ficto_me_epp' => [
                'has_tie' => !empty($meEppEligibleForPreference),
                'eligible_suppliers' => $meEppEligibleForPreference,
            ],
        ];
    }
}
