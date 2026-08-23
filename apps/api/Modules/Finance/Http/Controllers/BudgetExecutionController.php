<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Finance\Models\BudgetCommitment;
use Modules\Finance\Models\BudgetSettlement;
use Modules\Finance\Services\BudgetExecutionService;

final class BudgetExecutionController extends Controller
{
    public function __construct(
        private readonly BudgetExecutionService $budgetService
    ) {}

    public function commitments(Request $request): JsonResponse
    {
        $commitments = BudgetCommitment::query()
            ->when($request->query('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->query('search'), fn ($q, $term) => $q->where(function ($sub) use ($term) {
                $sub->where('commitment_number', 'like', "%{$term}%")
                    ->orWhere('supplier_name', 'like', "%{$term}%")
                    ->orWhere('description', 'like', "%{$term}%");
            }))
            ->latest('commitment_date')
            ->paginate((int) $request->query('per_page', 25));

        return response()->json($commitments);
    }

    public function storeCommitment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'commitment_date' => ['required', 'date'],
            'supplier_name' => ['required', 'string', 'max:255'],
            'supplier_cnpj' => ['nullable', 'string', 'max:18'],
            'expense_nature' => ['required', 'string', 'max:20'],
            'function_code' => ['nullable', 'string', 'max:10'],
            'description' => ['required', 'string', 'max:255'],
            'amount_cents' => ['required', 'integer', 'min:1'],
        ]);

        $commitment = $this->budgetService->createCommitment($validated);
        return response()->json($commitment, 201);
    }

    public function showCommitment(int $id): JsonResponse
    {
        $commitment = BudgetCommitment::with(['settlements.payments'])->findOrFail($id);
        return response()->json($commitment);
    }

    public function storeSettlement(Request $request, int $commitmentId): JsonResponse
    {
        $commitment = BudgetCommitment::findOrFail($commitmentId);

        $validated = $request->validate([
            'settlement_date' => ['required', 'date'],
            'invoice_number' => ['nullable', 'string', 'max:50'],
            'amount_cents' => ['required', 'integer', 'min:1'],
        ]);

        $settlement = $this->budgetService->createSettlement($commitment, $validated);
        return response()->json($settlement, 201);
    }

    public function storePayment(Request $request, int $settlementId): JsonResponse
    {
        $settlement = BudgetSettlement::with('commitment')->findOrFail($settlementId);

        $validated = $request->validate([
            'payment_date' => ['required', 'date'],
            'amount_cents' => ['required', 'integer', 'min:1'],
            'bank_account' => ['nullable', 'string', 'max:50'],
        ]);

        $payment = $this->budgetService->createPayment($settlement, $validated);
        return response()->json($payment, 201);
    }

    public function budgetSummary(): JsonResponse
    {
        $totalCommittedCents = (int) BudgetCommitment::query()->sum('amount_cents');
        $totalSettledCents = (int) BudgetCommitment::query()->sum('settled_amount_cents');
        $totalPaidCents = (int) BudgetCommitment::query()->sum('paid_amount_cents');
        $restosAPagarCents = max(0, $totalCommittedCents - $totalPaidCents);

        return response()->json([
            'total_committed_cents' => $totalCommittedCents,
            'total_settled_cents' => $totalSettledCents,
            'total_paid_cents' => $totalPaidCents,
            'restos_a_pagar_cents' => $restosAPagarCents,
            'execution_rate_percent' => $totalCommittedCents > 0
                ? round(($totalPaidCents / $totalCommittedCents) * 100, 2)
                : 0,
        ]);
    }
}
