<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Controllers;

use Modules\Admin\Models\SaasInvoice;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use App\Support\AuditLogger;
use Illuminate\Http\Request;

final class SaasBillingController
{
    use AuthorizesRequests;

    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', SaasInvoice::class);

        $query = SaasInvoice::query()->with('tenant:id,name,slug')->latest('due_at');

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate(25));
    }

    public function markAsPaid(Request $request, SaasInvoice $invoice, AuditLogger $audit): JsonResponse
    {
        $this->authorize('update', $invoice);

        $data = $request->validate([
            'paid_at' => ['required', 'date'],
        ]);

        if ($invoice->status === 'paid') {
            return response()->json(['message' => 'Invoice já liquidada.'], 409);
        }

        $before = $invoice->toArray();
        $invoice->update([
            'status' => 'paid',
            'paid_at' => $data['paid_at'],
        ]);

        $audit->record('admin', 'invoice.paid', 'saas_invoice:'.$invoice->getKey(), $before, $invoice->toArray());

        return response()->json($invoice->fresh());
    }
}
