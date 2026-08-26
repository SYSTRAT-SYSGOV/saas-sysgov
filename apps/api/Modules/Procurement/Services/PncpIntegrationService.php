<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use App\Support\OutboxPublisher;
use Modules\Procurement\Models\Licitacao;
use Modules\Procurement\Models\LicitacaoContrato;

final readonly class PncpIntegrationService
{
    public function __construct(
        private OutboxPublisher $outbox
    ) {}

    /**
     * Envia evento para fila de sincronização com o PNCP (Portal Nacional de Contratações Públicas)
     */
    public function publishProcurementNotice(Licitacao $licitacao): void
    {
        $payload = [
            'licitacao_id' => $licitacao->id,
            'numero' => $licitacao->numero,
            'ano' => $licitacao->ano,
            'modalidade' => $licitacao->modalidade,
            'objeto' => $licitacao->objeto,
            'criterio_julgamento' => $licitacao->criterio_julgamento,
            'valor_estimado_cents' => $licitacao->valor_estimado_cents,
            'data_abertura' => $licitacao->data_abertura?->toIso8601String(),
            'fundamento_legal' => $licitacao->fundamento_legal,
            'srp' => $licitacao->srp,
            'tenant_id' => $licitacao->tenant_id,
        ];

        // Publica no Outbox para processamento assíncrono garantido
        $this->outbox->publish(
            'procurement',
            'PncpNoticePublished',
            $payload
        );
    }

    /**
     * Envia evento para fila de sincronização de contrato com o PNCP
     */
    public function publishContract(LicitacaoContrato $contrato): void
    {
        $payload = [
            'contrato_id' => $contrato->id,
            'numero' => $contrato->numero,
            'fornecedor_nome' => $contrato->fornecedor_nome,
            'fornecedor_cnpj' => $contrato->fornecedor_cnpj,
            'valor_inicial_cents' => $contrato->valor_inicial_cents,
            'vigencia_inicio' => $contrato->vigencia_inicio->toDateString(),
            'vigencia_fim' => $contrato->vigencia_fim->toDateString(),
            'tenant_id' => $contrato->tenant_id,
        ];

        $this->outbox->publish(
            'procurement',
            'PncpContractPublished',
            $payload
        );
    }
}
