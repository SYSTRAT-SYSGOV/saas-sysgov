<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Finance\Models\AccountingEntry;
use Modules\Finance\Models\ChartOfAccount;
use Modules\Finance\Services\AccountingService;

final class AccountingController extends Controller
{
    public function __construct(
        private readonly AccountingService $accountingService
    ) {}

    public function chartOfAccounts(Request $request): JsonResponse
    {
        $accounts = ChartOfAccount::query()
            ->when($request->query('account_type'), fn ($q, $t) => $q->where('account_type', $t))
            ->orderBy('code')
            ->get();

        return response()->json($accounts);
    }

    public function entries(Request $request): JsonResponse
    {
        $entries = AccountingEntry::query()
            ->with(['lines.account:id,code,name,nature', 'creator:id,name'])
            ->latest('entry_date')
            ->paginate((int) $request->query('per_page', 25));

        return response()->json($entries);
    }

    public function storeEntry(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_date' => ['required', 'date'],
            'description' => ['required', 'string', 'max:255'],
            'document_ref' => ['nullable', 'string', 'max:100'],
            'lines' => ['required', 'array', 'min:2'],
            'lines.*.account_id' => ['required', 'integer', 'exists:chart_of_accounts,id'],
            'lines.*.type' => ['required', 'string', 'in:debito,credito'],
            'lines.*.amount_cents' => ['required', 'integer', 'min:1'],
            'lines.*.memo' => ['nullable', 'string', 'max:255'],
        ]);

        $entry = $this->accountingService->createEntry($validated, $request->user()->id);
        return response()->json($entry->load('lines.account'), 201);
    }

    public function trialBalance(Request $request): JsonResponse
    {
        $year = (int) $request->query('year', date('Y'));
        $month = $request->query('month') ? (int) $request->query('month') : null;

        $trialBalance = $this->accountingService->generateTrialBalance($year, $month);
        return response()->json($trialBalance);
    }
}
