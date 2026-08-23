<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Modules\Finance\Http\Requests\StoreExpenseRequest;
use Modules\Finance\Http\Requests\StoreRevenueRequest;
use Modules\Finance\Models\Expense;
use Modules\Finance\Models\Revenue;
use Modules\Finance\Services\FinanceService;

final class FinanceEntryController
{
    use AuthorizesRequests;

    public function __construct(private readonly FinanceService $service) {}

    public function indexRevenues(): JsonResponse
    {
        $this->authorize('viewAny', Revenue::class);
        return response()->json(Revenue::query()->latest('occurred_at')->paginate(25));
    }

    public function storeRevenue(StoreRevenueRequest $request): JsonResponse
    {
        return response()->json($this->service->createRevenue($request->validated()), 201);
    }

    public function updateRevenue(StoreRevenueRequest $request, Revenue $revenue): JsonResponse
    {
        $this->authorize('update', $revenue);
        return response()->json($this->service->updateRevenue($revenue, $request->validated()));
    }

    public function indexExpenses(): JsonResponse
    {
        $this->authorize('viewAny', Expense::class);
        return response()->json(Expense::query()->latest('occurred_at')->paginate(25));
    }

    public function storeExpense(StoreExpenseRequest $request): JsonResponse
    {
        return response()->json($this->service->createExpense($request->validated()), 201);
    }

    public function updateExpense(StoreExpenseRequest $request, Expense $expense): JsonResponse
    {
        $this->authorize('update', $expense);
        return response()->json($this->service->updateExpense($expense, $request->validated()));
    }
}
