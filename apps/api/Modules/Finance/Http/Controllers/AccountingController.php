<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Support\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Finance\Models\AccountingEntry;
use Modules\Finance\Models\ChartOfAccount;
use Modules\Finance\Services\AccountingService;
use Throwable;

final class AccountingController extends Controller
{
    public function __construct(
        private readonly AccountingService $accountingService,
    ) {}

    public function chartOfAccounts(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTenantId();

        $query = ChartOfAccount::query();

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        $accounts = $query
            ->when($request->query('account_type'), fn ($q, $t) => $q->where('account_type', $t))
            ->orderBy('code')
            ->get();

        return response()->json($accounts);
    }

    public function entries(Request $request): JsonResponse
    {
        $tenantId = $this->resolveTenantId();

        $query = AccountingEntry::query()->with(['lines.account:id,code,name,nature', 'creator:id,name']);

        if ($tenantId !== null) {
            $query->where('tenant_id', $tenantId);
        }

        $entries = $query->latest('entry_date')->paginate((int) $request->query('per_page', 25));

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
        $tenantId = $this->resolveTenantId();
        $year = (int) $request->query('year', date('Y'));
        $month = $request->query('month') ? (int) $request->query('month') : null;

        $trialBalance = $this->accountingService->generateTrialBalance($year, $month, $tenantId);
        return response()->json($trialBalance);
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
