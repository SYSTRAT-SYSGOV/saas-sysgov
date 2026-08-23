<?php

declare(strict_types=1);

namespace Modules\Contracts\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Validation\ValidationException;
use Modules\Contracts\Models\Contract;
use Modules\Contracts\Models\ContractAddendum;
use Modules\Contracts\Models\ContractHistory;

final readonly class ContractLifecycleService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox
    ) {}

    public function createContract(array $data): Contract
    {
        $contract = Contract::create($data);

        $this->audit->record('contracts', 'contract.created', "Contrato #{$contract->number}", null, $contract->toArray());
        $this->outbox->publish('contracts.ContractCreated', [
            'id' => $contract->id,
            'number' => $contract->number,
            'title' => $contract->title,
            'amount_cents' => $contract->amount_cents,
        ]);

        return $contract;
    }

    public function addAddendum(Contract $contract, array $data): ContractAddendum
    {
        $requestedAmountCents = (int) ($data['amount_cents'] ?? 0);
        $newTotalAddenda = $contract->total_addenda_amount_cents + $requestedAmountCents;
        $maxAllowed = $contract->max_allowed_addenda_cents;

        // Validação legal do teto de aditamento da Lei 14.133/2021
        if ($requestedAmountCents > 0 && $newTotalAddenda > $maxAllowed) {
            throw ValidationException::withMessages([
                'amount_cents' => [
                    "O aditivo de R$ " . number_format($requestedAmountCents / 100, 2, ',', '.') .
                    " ultrapassa o limite legal de {$contract->max_addenda_percent}% (Máximo permitido: R$ " .
                    number_format($maxAllowed / 100, 2, ',', '.') . ")."
                ]
            ]);
        }

        $addendum = $contract->addenda()->create([
            'number' => $data['number'],
            'reason' => $data['reason'],
            'amount_cents' => $requestedAmountCents,
            'effective_at' => $data['effective_at'],
        ]);

        $before = $contract->toArray();
        $contract->update([
            'total_addenda_amount_cents' => $newTotalAddenda,
        ]);

        ContractHistory::create([
            'contract_id' => $contract->id,
            'user_id' => auth()->check() ? auth()->id() : null,
            'action' => 'addendum_created',
            'before' => $before,
            'after' => $contract->fresh()->toArray(),
            'created_at' => now(),
        ]);

        $this->audit->record('contracts', 'contract.addendum_added', "Aditivo {$addendum->number} no Contrato #{$contract->number}", $before, $contract->toArray());
        $this->outbox->publish('contracts.ContractAddendumAdded', [
            'contract_id' => $contract->id,
            'addendum_id' => $addendum->id,
            'new_total_cents' => $contract->effective_total_cents,
        ]);

        return $addendum;
    }

    public function changeStatus(Contract $contract, string $newStatus, ?string $reason = null): Contract
    {
        $before = $contract->toArray();
        $contract->update([
            'status' => $newStatus,
            'cancellation_reason' => $reason,
        ]);

        ContractHistory::create([
            'contract_id' => $contract->id,
            'user_id' => auth()->check() ? auth()->id() : null,
            'action' => "status_changed_to_{$newStatus}",
            'before' => $before,
            'after' => $contract->toArray(),
            'created_at' => now(),
        ]);

        $this->audit->record('contracts', "contract.status_{$newStatus}", "Contrato #{$contract->number} alterado para {$newStatus}", $before, $contract->toArray());
        $this->outbox->publish('contracts.ContractStatusChanged', [
            'contract_id' => $contract->id,
            'old_status' => $before['status'],
            'new_status' => $newStatus,
        ]);

        return $contract;
    }
}
