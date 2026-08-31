<?php

declare(strict_types=1);

namespace Modules\Finance\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use App\Support\TenantContext;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Modules\Finance\Models\AccountingEntry;
use Modules\Finance\Models\ChartOfAccount;
use Throwable;

final readonly class AccountingService
{
    public function __construct(
        private AuditLogger $audit,
        private OutboxPublisher $outbox
    ) {}

    public function createEntry(array $data, int $userId): AccountingEntry
    {
        $lines = $data['lines'] ?? [];
        if (count($lines) < 2) {
            throw ValidationException::withMessages([
                'lines' => ['Um lançamento contábil exige no mínimo duas partidas dobradas (um débito e um crédito).']
            ]);
        }

        $totalDebits = 0;
        $totalCredits = 0;

        foreach ($lines as $line) {
            $amount = (int) $line['amount_cents'];
            if ($line['type'] === 'debito') {
                $totalDebits += $amount;
            } else {
                $totalCredits += $amount;
            }
        }

        if ($totalDebits !== $totalCredits) {
            throw ValidationException::withMessages([
                'lines' => [
                    "As partidas dobradas estão desbalanceadas: Total Débitos (R$ " .
                    number_format($totalDebits / 100, 2, ',', '.') . ") != Total Créditos (R$ " .
                    number_format($totalCredits / 100, 2, ',', '.') . ")."
                ]
            ]);
        }

        $tenantId = $this->resolveTenantId();
        $year = date('Y', strtotime($data['entry_date']));
        $countQuery = AccountingEntry::query()->whereYear('entry_date', $year);
        if ($tenantId !== null) {
            $countQuery->where('tenant_id', $tenantId);
        }
        $count = $countQuery->count() + 1;
        $entryNumber = sprintf('LC-%s-%05d', $year, $count);

        return DB::transaction(function () use ($data, $userId, $entryNumber, $totalDebits, $lines, $tenantId) {
            $entry = AccountingEntry::create([
                'entry_number' => $entryNumber,
                'entry_date' => $data['entry_date'],
                'description' => $data['description'],
                'document_ref' => $data['document_ref'] ?? null,
                'total_amount_cents' => $totalDebits,
                'status' => 'confirmado',
                'created_by' => $userId,
            ]);

            foreach ($lines as $line) {
                $entry->lines()->create([
                    'account_id' => $line['account_id'],
                    'type' => $line['type'],
                    'amount_cents' => (int) $line['amount_cents'],
                    'memo' => $line['memo'] ?? null,
                ]);
            }

            $this->audit->record('accounting', 'entry.created', "Lançamento Contábil #{$entryNumber}", null, $entry->toArray());
            $this->outbox->publish('accounting.EntryCreated', [
                'entry_id' => $entry->id,
                'entry_number' => $entry->entry_number,
                'total_cents' => $entry->total_amount_cents,
            ]);

            return $entry;
        });
    }

    public function generateTrialBalance(int $year, ?int $month = null, ?int $tenantId = null): array
    {
        $tenantId = $tenantId ?? $this->resolveTenantId();

        $accountsQuery = ChartOfAccount::query();
        if ($tenantId !== null) {
            $accountsQuery->where('tenant_id', $tenantId);
        }
        $accounts = $accountsQuery->orderBy('code')->get();

        $balanceRows = [];
        $grandTotalDebits = 0;
        $grandTotalCredits = 0;

        foreach ($accounts as $account) {
            $entryQuery = $account->lines()->whereHas('entry', function ($q) use ($year, $month, $tenantId) {
                $q->whereYear('entry_date', $year);
                if ($month !== null) {
                    $q->whereMonth('entry_date', '<=', $month);
                }
                if ($tenantId !== null) {
                    $q->where($q->qualifyColumn('tenant_id'), $tenantId);
                }
            });

            $totalDebits = (int) (clone $entryQuery)->where('type', 'debito')->sum('amount_cents');
            $totalCredits = (int) (clone $entryQuery)->where('type', 'credito')->sum('amount_cents');

            $balanceCents = $account->nature === 'devedora'
                ? ($totalDebits - $totalCredits)
                : ($totalCredits - $totalDebits);

            $grandTotalDebits += $totalDebits;
            $grandTotalCredits += $totalCredits;

            $balanceRows[] = [
                'id' => $account->id,
                'code' => $account->code,
                'name' => $account->name,
                'account_type' => $account->account_type,
                'nature' => $account->nature,
                'level' => $account->level,
                'is_synthetic' => $account->is_synthetic,
                'total_debits_cents' => $totalDebits,
                'total_credits_cents' => $totalCredits,
                'balance_cents' => $balanceCents,
            ];
        }

        return [
            'period' => ['year' => $year, 'month' => $month],
            'accounts' => $balanceRows,
            'summary' => [
                'total_debits_cents' => $grandTotalDebits,
                'total_credits_cents' => $grandTotalCredits,
                'is_balanced' => ($grandTotalDebits === $grandTotalCredits),
            ],
        ];
    }

    private function resolveTenantId(): ?int
    {
        try {
            return app(TenantContext::class)->id();
        } catch (Throwable) {
            return null;
        }
    }
}
