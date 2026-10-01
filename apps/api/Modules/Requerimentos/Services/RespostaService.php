<?php

declare(strict_types=1);

namespace Modules\Requerimentos\Services;

use Modules\Requerimentos\Models\Resposta;
use Modules\Requerimentos\Models\TramitacaoPoderes;

final class RespostaService
{
    /**
     * Elabora uma resposta como rascunho ou envia diretamente.
     *
     * @param array<string, mixed> $dados
     */
    public function elaborar(TramitacaoPoderes $tramitacao, array $dados, int $elaboradoPor): Resposta
    {
        $status = $dados['enviar_diretamente'] ?? false
            ? Resposta::STATUS_ENVIADO
            : Resposta::STATUS_RASCUNHO;

        $resposta = Resposta::create([
            'tenant_id'     => $tramitacao->tenant_id,
            'tramitacao_id' => $tramitacao->id,
            'elaborado_por' => $elaboradoPor,
            'conteudo'      => $dados['conteudo'],
            'status'        => $status,
            'enviado_em'    => $status === Resposta::STATUS_ENVIADO ? now() : null,
        ]);

        if ($status === Resposta::STATUS_ENVIADO) {
            $tramitacao->update(['status' => TramitacaoPoderes::STATUS_RESPONDIDO]);
            $tramitacao->proposicao->update(['status' => \Modules\Requerimentos\Models\Proposicao::STATUS_RESPONDIDO]);

            event(new \Modules\Requerimentos\Events\TramitacaoRespondida($tramitacao, $resposta));
        }

        return $resposta;
    }

    /**
     * Envia uma resposta que estava em rascunho.
     *
     * @throws \DomainException
     */
    public function enviar(Resposta $resposta): void
    {
        if ($resposta->isEnviado()) {
            throw new \DomainException('Resposta já enviada não pode ser editada.');
        }

        $resposta->update([
            'status'     => Resposta::STATUS_ENVIADO,
            'enviado_em' => now(),
        ]);

        $resposta->tramitacao->update(['status' => TramitacaoPoderes::STATUS_RESPONDIDO]);
        $resposta->tramitacao->proposicao->update(['status' => \Modules\Requerimentos\Models\Proposicao::STATUS_RESPONDIDO]);

        event(new \Modules\Requerimentos\Events\TramitacaoRespondida($resposta->tramitacao, $resposta));
    }
}