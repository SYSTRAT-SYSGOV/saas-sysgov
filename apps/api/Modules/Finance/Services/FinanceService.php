<?php

declare(strict_types=1);

namespace Modules\Finance\Services;

use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Finance\Models\Expense;
use Modules\Finance\Models\Revenue;

final class FinanceService
{
    public function __construct(private AuditLogger $audit, private OutboxPublisher $outbox) {}

    public function createRevenue(array $data): Revenue
    {
        $revenue = DB::transaction(fn (): Revenue => Revenue::create($data));
        $this->audit->record('finance', 'created', 'revenue:'.$revenue->getKey(), null, $revenue->toArray());
        $this->outbox->publish('finance.revenue.created', ['revenue_id' => $revenue->getKey(), 'amount_cents' => $revenue->amount_cents]);
        return $revenue;
    }

    public function updateRevenue(Revenue $revenue, array $data): Revenue
    {
        $before = $revenue->toArray();
        DB::transaction(fn (): bool => $revenue->update($data));
        $this->audit->record('finance', 'updated', 'revenue:'.$revenue->getKey(), $before, $revenue->toArray());
        $this->outbox->publish('finance.revenue.updated', ['revenue_id' => $revenue->getKey(), 'amount_cents' => $revenue->amount_cents]);
        return $revenue->refresh();
    }

    public function createExpense(array $data): Expense
    {
        $expense = DB::transaction(fn (): Expense => Expense::create($data));
        $this->audit->record('finance', 'created', 'expense:'.$expense->getKey(), null, $expense->toArray());
        $this->outbox->publish('finance.expense.created', ['expense_id' => $expense->getKey(), 'amount_cents' => $expense->amount_cents]);
        return $expense;
    }

    public function updateExpense(Expense $expense, array $data): Expense
    {
        $before = $expense->toArray();
        DB::transaction(fn (): bool => $expense->update($data));
        $this->audit->record('finance', 'updated', 'expense:'.$expense->getKey(), $before, $expense->toArray());
        $this->outbox->publish('finance.expense.updated', ['expense_id' => $expense->getKey(), 'amount_cents' => $expense->amount_cents]);
        return $expense->refresh();
    }
}
