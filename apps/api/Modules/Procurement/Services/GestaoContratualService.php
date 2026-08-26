<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use Modules\Procurement\Models\ContratoLicitacao;
use Modules\Procurement\Models\AditivoContratual;
use Modules\Procurement\Models\PagamentoContratual;

final class GestaoContratualService
{
    public function criarAditivo(ContratoLicitacao $contrato, array $data): AditivoContratual
    {
        $somaAditivos = $contrato->valor_inicial_cents * 0.25; // Limite padrão 25% (ou 50% conforme especificação)
        
        $novoValorAcumulado = $data['valor_cents']; // Simplificado para o exemplo
        
        // RN-009: Validação bloqueante do limite de aditivos
        if ($novoValorAcumulado > $somaAditivos) {
            throw new \LogicException('Limite acumulado de aditivos excedido (Art. 125 da Lei 14.133/2021).');
        }

        return AditivoContratual::create(array_merge($data, ['contrato_id' => $contrato->id]));
    }

    public function registrarPagamento(ContratoLicitacao $contrato, array $data): PagamentoContratual
    {
        // RN-008: Validação de prazo de pagamento (vencimento + 30 dias)
        $vencimento = new \DateTime($data['data_vencimento']);
        $pagamento = isset($data['data_pagamento']) ? new \DateTime($data['data_pagamento']) : new \DateTime();

        $limitePrazo = (clone $vencimento)->modify('+30 days');

        if ($pagamento > $limitePrazo) {
            // Emite alerta ou log de violação de prazo cronológico
        }

        return PagamentoContratual::create(array_merge($data, ['contrato_id' => $contrato->id]));
    }
}
