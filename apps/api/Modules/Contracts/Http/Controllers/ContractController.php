<?php

declare(strict_types=1);

namespace Modules\Contracts\Http\Controllers;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Modules\Contracts\Models\Contract;
use Modules\Contracts\Services\ContractLifecycleService;

final class ContractController extends Controller
{
    public function __construct(
        private readonly ContractLifecycleService $lifecycle
    ) {}

    public function index(Request $request): JsonResponse
    {
        $query = Contract::query()->with(['manager:id,name', 'inspector:id,name']);

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->query('contract_type')) {
            $query->where('contract_type', $type);
        }

        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('number', 'like', "%{$search}%")
                  ->orWhere('title', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%")
                  ->orWhere('supplier_cnpj', 'like', "%{$search}%");
            });
        }

        $contracts = $query->latest('ends_at')->paginate((int) $request->query('per_page', 25));
        return response()->json($contracts);
    }

    public function show(int $id): JsonResponse
    {
        $contract = Contract::with(['addenda', 'attachments', 'history.user:id,name', 'manager', 'inspector'])
            ->findOrFail($id);

        return response()->json([
            'contract' => $contract,
            'metrics' => [
                'amount_cents' => $contract->amount_cents,
                'total_addenda_cents' => $contract->total_addenda_amount_cents,
                'effective_total_cents' => $contract->effective_total_cents,
                'max_allowed_addenda_cents' => $contract->max_allowed_addenda_cents,
                'addenda_percentage_used' => $contract->amount_cents > 0
                    ? round(($contract->total_addenda_amount_cents / $contract->amount_cents) * 100, 2)
                    : 0,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'number' => ['required', 'string', 'max:50'],
            'title' => ['required', 'string', 'max:255'],
            'contract_type' => ['nullable', 'string'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'supplier_cnpj' => ['nullable', 'string', 'max:18'],
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'inspector_id' => ['nullable', 'integer', 'exists:users,id'],
            'starts_at' => ['required', 'date'],
            'ends_at' => ['required', 'date', 'after_or_equal:starts_at'],
            'amount_cents' => ['required', 'integer', 'min:0'],
            'max_addenda_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'renewal_rule' => ['nullable', 'string'],
        ]);

        $contract = $this->lifecycle->createContract($validated);
        return response()->json($contract, 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:255'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'supplier_cnpj' => ['nullable', 'string', 'max:18'],
            'manager_id' => ['nullable', 'integer', 'exists:users,id'],
            'inspector_id' => ['nullable', 'integer', 'exists:users,id'],
            'starts_at' => ['sometimes', 'date'],
            'ends_at' => ['sometimes', 'date'],
            'renewal_rule' => ['nullable', 'string'],
        ]);

        $contract->update($validated);
        return response()->json($contract);
    }

    public function addAddendum(Request $request, int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'number' => ['required', 'string', 'max:50'],
            'reason' => ['required', 'string'],
            'amount_cents' => ['required', 'integer'],
            'effective_at' => ['required', 'date'],
        ]);

        $addendum = $this->lifecycle->addAddendum($contract, $validated);
        return response()->json($addendum, 201);
    }

    public function changeStatus(Request $request, int $id): JsonResponse
    {
        $contract = Contract::findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:draft,active,in_renewal,suspended,ended,cancelled'],
            'reason' => ['nullable', 'string'],
        ]);

        $updated = $this->lifecycle->changeStatus($contract, $validated['status'], $validated['reason'] ?? null);
        return response()->json($updated);
    }

    public function summaryKPIs(): JsonResponse
    {
        $totalContracts = Contract::query()->count();
        $activeContracts = Contract::query()->where('status', 'active')->count();
        $totalAmountCents = (int) Contract::query()->sum('amount_cents');
        $totalAddendaCents = (int) Contract::query()->sum('total_addenda_amount_cents');
        
        $expiring30Days = Contract::query()
            ->where('status', 'active')
            ->whereBetween('ends_at', [now(), now()->addDays(30)])
            ->count();

        $expiring60Days = Contract::query()
            ->where('status', 'active')
            ->whereBetween('ends_at', [now(), now()->addDays(60)])
            ->count();

        return response()->json([
            'total_contracts' => $totalContracts,
            'active_contracts' => $activeContracts,
            'total_amount_cents' => $totalAmountCents,
            'total_addenda_cents' => $totalAddendaCents,
            'effective_total_cents' => $totalAmountCents + $totalAddendaCents,
            'expiring_30_days' => $expiring30Days,
            'expiring_60_days' => $expiring60Days,
        ]);
    }
}
