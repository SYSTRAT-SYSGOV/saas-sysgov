<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Services;

use App\Models\User;
use Carbon\Carbon;
use Modules\Requerimentos\Events\TramitacaoEncaminhada;
use Modules\Requerimentos\Models\Proposicao;
use Modules\Requerimentos\Models\TramitacaoPoderes;

final class TramitacaoPoderesService
{
    /**
     * Encaminha uma proposição de um Poder a outro.
     *
     * @param array<string, mixed> $dados
     * @throws \DomainException
     */
    public function encaminhar(Proposicao $proposicao, array $dados, User $remetente): TramitacaoPoderes
    {
        if ($dados['poder_origem'] === $dados['poder_destino']) {
            throw new \DomainException('O Poder de origem e destino devem ser diferentes.');
        }

        $prazoDias = $dados['prazo_dias'] ?? $proposicao->tipoInstrumento->prazo_regimental_dias ?? 30;

        $tramitacao = TramitacaoPoderes::create([
            'tenant_id'            => $proposicao->tenant_id,
            'proposicao_id'        => $proposicao->id,
            'poder_origem'         => $dados['poder_origem'],
            'poder_destino'        => $dados['poder_destino'],
            'remetente_id'         => $remetente->id,
            'responsavel_id'       => $dados['responsavel_id'] ?? null,
            'data_encaminhamento'  => Carbon::today(),
            'data_limite_resposta' => Carbon::today()->addDays($prazoDias),
            'status'               => TramitacaoPoderes::STATUS_ENCAMINHADO,
            'observacao'           => $dados['observacao'] ?? null,
        ]);

        // Atualiza o status da proposição
        $proposicao->update(['status' => Proposicao::STATUS_ENCAMINHADO]);

        event(new TramitacaoEncaminhada($tramitacao));

        return $tramitacao;
    }

    /**
     * Registra o recebimento da proposição pelo Poder destinatário.
     */
    public function registrarRecebimento(TramitacaoPoderes $tramitacao, User $usuario): void
    {
        if ($tramitacao->status !== TramitacaoPoderes::STATUS_ENCAMINHADO) {
            throw new \DomainException('A tramitação não está no status "encaminhado" para registrar recebimento.');
        }

        $tramitacao->update([
            'data_recebimento' => Carbon::today(),
            'status'           => TramitacaoPoderes::STATUS_RECEBIDO,
        ]);

        $tramitacao->proposicao->update(['status' => Proposicao::STATUS_RECEBIDO]);

        event(new \Modules\Requerimentos\Events\TramitacaoRecebida($tramitacao));
    }

    /**
     * Devolve a tramitação com resposta ao Poder de origem.
     *
     * @param array<int, mixed> $anexos
     */
    public function devolver(TramitacaoPoderes $tramitacao, string $conteudo, array $anexos, User $elaborador): void
    {
        if ($tramitacao->status !== TramitacaoPoderes::STATUS_RECEBIDO) {
            throw new \DomainException('A tramitação deve estar no status "recebido" para ser respondida.');
        }

        $resposta = \Modules\Requerimentos\Models\Resposta::create([
            'tenant_id'     => $tramitacao->tenant_id,
            'tramitacao_id' => $tramitacao->id,
            'elaborado_por' => $elaborador->id,
            'conteudo'      => $conteudo,
            'status'        => \Modules\Requerimentos\Models\Resposta::STATUS_ENVIADO,
            'enviado_em'    => now(),
        ]);

        $tramitacao->update(['status' => TramitacaoPoderes::STATUS_RESPONDIDO]);
        $tramitacao->proposicao->update(['status' => Proposicao::STATUS_RESPONDIDO]);

        event(new \Modules\Requerimentos\Events\TramitacaoRespondida($tramitacao, $resposta));
    }
}