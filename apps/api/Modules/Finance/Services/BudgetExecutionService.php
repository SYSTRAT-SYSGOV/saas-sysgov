<?php

declare(strict_types=1);

namespace Modules\Finance\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Finance\Models\BudgetCommitment;
use Modules\Finance\Models\BudgetPayment;
use Modules\Finance\Models\BudgetSettlement;

final readonly class BudgetExecutionService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox
    ) {}

    public function createCommitment(array $data): BudgetCommitment
    {
        $year = date('Y', strtotime($data['commitment_date']));
        $count = BudgetCommitment::query()->whereYear('commitment_date', $year)->count() + 1;
        $commitmentNumber = sprintf('%sNE%06d', $year, $count);

        $commitment = BudgetCommitment::create(array_merge($data, [
            'commitment_number' => $commitmentNumber,
            'settled_amount_cents' => 0,
            'paid_amount_cents' => 0,
            'status' => 'empenhado',
        ]));

        $this->audit->record('finance', 'commitment.created', "Empenho #{$commitmentNumber}", null, $commitment->toArray());
        $this->outbox->publish('finance.CommitmentCreated', [
            'commitment_id' => $commitment->id,
            'commitment_number' => $commitment->commitment_number,
            'amount_cents' => $commitment->amount_cents,
        ]);

        return $commitment;
    }

    public function createSettlement(BudgetCommitment $commitment, array $data): BudgetSettlement
    {
        $requestedAmountCents = (int) $data['amount_cents'];
        $unsettled = $commitment->unsettled_amount_cents;

        if ($requestedAmountCents > $unsettled) {
            throw ValidationException::withMessages([
                'amount_cents' => [
                    "O valor da liquidação (R$ " . number_format($requestedAmountCents / 100, 2, ',', '.') .
                    ") excede o saldo empenhado disponível (R$ " . number_format($unsettled / 100, 2, ',', '.') . ")."
                ]
            ]);
        }

        $year = date('Y', strtotime($data['settlement_date']));
        $count = BudgetSettlement::query()->whereYear('settlement_date', $year)->count() + 1;
        $settlementNumber = sprintf('%sNL%06d', $year, $count);

        return DB::transaction(function () use ($commitment, $data, $settlementNumber, $requestedAmountCents) {
            $settlement = $commitment->settlements()->create([
                'org_unit_id' => $commitment->org_unit_id,
                'settlement_number' => $settlementNumber,
                'settlement_date' => $data['settlement_date'],
                'invoice_number' => $data['invoice_number'] ?? null,
                'amount_cents' => $requestedAmountCents,
                'status' => 'liquidado',
            ]);

            $newSettledTotal = $commitment->settled_amount_cents + $requestedAmountCents;
            $newStatus = $newSettledTotal >= $commitment->amount_cents ? 'liquidado' : 'liquidado_parcial';

            $commitment->update([
                'settled_amount_cents' => $newSettledTotal,
                'status' => $newStatus,
            ]);

            $this->audit->record('finance', 'settlement.created', "Liquidação #{$settlementNumber}", null, $settlement->toArray());
            $this->outbox->publish('finance.SettlementCreated', [
                'settlement_id' => $settlement->id,
                'commitment_id' => $commitment->id,
                'amount_cents' => $settlement->amount_cents,
            ]);

            return $settlement;
        });
    }

    public function createPayment(BudgetSettlement $settlement, array $data): BudgetPayment
    {
        $requestedAmountCents = (int) $data['amount_cents'];
        if ($requestedAmountCents > $settlement->amount_cents) {
            throw ValidationException::withMessages([
                'amount_cents' => ['O valor da ordem de pagamento não pode exceder o valor liquidado.']
            ]);
        }

        $year = date('Y', strtotime($data['payment_date']));
        $count = BudgetPayment::query()->whereYear('payment_date', $year)->count() + 1;
        $paymentNumber = sprintf('%sOB%06d', $year, $count);

        return DB::transaction(function () use ($settlement, $data, $paymentNumber, $requestedAmountCents) {
            $payment = $settlement->payments()->create([
                'org_unit_id' => $settlement->org_unit_id,
                'payment_number' => $paymentNumber,
                'payment_date' => $data['payment_date'],
                'amount_cents' => $requestedAmountCents,
                'bank_account' => $data['bank_account'] ?? null,
                'status' => 'pago',
            ]);

            $commitment = $settlement->commitment;
            $newPaidTotal = $commitment->paid_amount_cents + $requestedAmountCents;
            $commitmentStatus = $newPaidTotal >= $commitment->amount_cents ? 'pago' : $commitment->status;

            $commitment->update([
                'paid_amount_cents' => $newPaidTotal,
                'status' => $commitmentStatus,
            ]);

            $this->audit->record('finance', 'payment.created', "Ordem Bancária #{$paymentNumber}", null, $payment->toArray());
            $this->outbox->publish('finance.PaymentCreated', [
                'payment_id' => $payment->id,
                'settlement_id' => $settlement->id,
                'amount_cents' => $payment->amount_cents,
            ]);

            return $payment;
        });
    }
}
