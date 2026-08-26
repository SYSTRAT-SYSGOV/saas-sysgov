<?php

declare(strict_types=1);

namespace Modules\Procurement\Services;

use DomainException;
use Modules\Procurement\Models\LicitacaoAditivo;
use Modules\Procurement\Models\LicitacaoContrato;
use Modules\Procurement\Models\LicitacaoPagamento;

final class ContractExecutionService
{
    /**
     * Valida e adiciona um aditivo contratual respeitando os limites legais do Art. 125 (RN-009)
     */
    public function createAddendum(
        LicitacaoContrato $contrato,
        string $numero,
        string $tipo,
        int $valorCents,
        string $motivo,
        ?string $novaVigenciaFim = null
    ): LicitacaoAditivo {
        $valorInicial = $contrato->valor_inicial_cents;
        if ($valorInicial <= 0) {
            throw new DomainException('O contrato possui valor inicial inválido para cálculo de aditivos.');
        }

        // Determinar limite percentual aplicável: 50% para obras/reformas, 25% padrão
        $isEngineering = str_contains(strtolower($contrato->objeto), 'obra') ||
            str_contains(strtolower($contrato->objeto), 'reforma') ||
            str_contains(strtolower($contrato->objeto), 'engenharia');

        $maxAllowedPercentage = $isEngineering
            ? (float) config('procurement.addendum_limits.engineering_works_percentage', 50.0)
            : (float) config('procurement.addendum_limits.general_percentage', 25.0);

        // Somar aditivos de acréscimo anteriores assinados ou em minuta
        $currentAdditionsCents = (int) LicitacaoAditivo::query()
            ->where('contrato_id', $contrato->id)
            ->whereIn('tipo', ['aditivo_acrescimo'])
            ->where('status', '!=', 'rejeitado')
            ->sum('valor_cents');

        $proposedTotalAdditionsCents = $currentAdditionsCents + ($tipo === 'aditivo_acrescimo' ? $valorCents : 0);
        $proposedCumulativePercentage = round(($proposedTotalAdditionsCents / $valorInicial) * 100, 2);

        // RN-009: Bloqueio rígido caso o percentual acumulado exceda o limite legal
        if ($tipo === 'aditivo_acrescimo' && $proposedCumulativePercentage > $maxAllowedPercentage) {
            throw new DomainException(
                "RN-009: Limite legal de aditivos excedido! O percentual acumulado proposto ({$proposedCumulativePercentage}%) " .
                "ultrapassa o limite legal de {$maxAllowedPercentage}% (Art. 125 da Lei nº 14.133/2021)."
            );
        }

        $addendumPercentage = round(($valorCents / $valorInicial) * 100, 2);

        $aditivo = LicitacaoAditivo::create([
            'tenant_id' => $contrato->tenant_id,
            'contrato_id' => $contrato->id,
            'numero' => $numero,
            'tipo' => $tipo,
            'valor_cents' => $valorCents,
            'percentual_aditivo' => $addendumPercentage,
            'percentual_acumulado' => $proposedCumulativePercentage,
            'nova_vigencia_fim' => $novaVigenciaFim,
            'motivo' => $motivo,
            'status' => 'minuta',
        ]);

        // Atualizar valor e vigência do contrato
        $novoValorContrato = $contrato->valor_atualizado_cents + $valorCents;
        $updateData = ['valor_atualizado_cents' => $novoValorContrato];
        if ($novaVigenciaFim) {
            $updateData['vigencia_fim'] = $novaVigenciaFim;
        }
        $contrato->update($updateData);

        return $aditivo;
    }

    /**
     * Valida e registra o pagamento com controle de pontualidade até 30 dias (RN-008)
     */
    public function registerPayment(
        LicitacaoContrato $contrato,
        string $notaFiscal,
        int $valorCents,
        string $dataVencimento,
        ?string $dataPagamento = null,
        ?string $ordemBancaria = null
    ): LicitacaoPagamento {
        $vencimentoCarbon = \Illuminate\Support\Carbon::parse($dataVencimento);
        $maxPaymentDate = $vencimentoCarbon->copy()->addDays((int) config('procurement.payment_max_days_after_due', 30));

        if ($dataPagamento) {
            $pagamentoCarbon = \Illuminate\Support\Carbon::parse($dataPagamento);

            // RN-008: Verificação de pontualidade legal
            if ($pagamentoCarbon->greaterThan($maxPaymentDate)) {
                $daysOverdue = $pagamentoCarbon->diffInDays($maxPaymentDate);
                throw new DomainException(
                    "RN-008: A data de pagamento ({$dataPagamento}) excede o limite legal de 30 dias após o vencimento " .
                    "(limite: {$maxPaymentDate->toDateString()}), incorrendo em atraso de {$daysOverdue} dias sujeito a juros e correção."
                );
            }
        }

        return LicitacaoPagamento::create([
            'tenant_id' => $contrato->tenant_id,
            'contrato_id' => $contrato->id,
            'nota_fiscal' => $notaFiscal,
            'valor_cents' => $valorCents,
            'data_vencimento' => $dataVencimento,
            'data_pagamento' => $dataPagamento,
            'status' => $dataPagamento ? 'pago' : 'pendente',
            'ordem_bancaria' => $ordemBancaria,
        ]);
    }
}
