<?php

declare(strict_types=1);

namespace Modules\Contracts\Http\Controllers;

use Illuminate\Http\JsonResponse;
use App\Support\AuditLogger;
use App\Support\OutboxPublisher;
use Illuminate\Support\Facades\DB;
use Modules\Contracts\Http\Requests\StoreContractRequest;
use Modules\Contracts\Http\Requests\UpdateContractRequest;
use Modules\Contracts\Models\Contract;

final class ContractController
{
    public function index(): JsonResponse
    {
        return response()->json(Contract::query()->latest('ends_at')->paginate(25));
    }

    public function store(StoreContractRequest $request, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $contract = DB::transaction(fn (): Contract => Contract::create($request->validated()));
        $audit->record('contracts', 'created', 'contract:'.$contract->getKey(), null, $contract->toArray());
        $outbox->publish('contract.created', ['contract_id' => $contract->getKey(), 'number' => $contract->number]);
        return response()->json($contract, 201);
    }

    public function update(UpdateContractRequest $request, Contract $contract, AuditLogger $audit, OutboxPublisher $outbox): JsonResponse
    {
        $before = $contract->toArray();
        $contract->update($request->validated());
        $audit->record('contracts', 'updated', 'contract:'.$contract->getKey(), $before, $contract->toArray());
        $outbox->publish('contract.updated', ['contract_id' => $contract->getKey(), 'number' => $contract->number]);
        return response()->json($contract);
    }
}
