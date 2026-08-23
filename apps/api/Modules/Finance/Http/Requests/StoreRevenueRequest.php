<?php

declare(strict_types=1);

namespace Modules\Finance\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreRevenueRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('create', \Modules\Finance\Models\Revenue::class) === true; }
    public function rules(): array { return ['description' => ['required', 'string', 'max:255'], 'amount_cents' => ['required', 'integer', 'min:1'], 'occurred_at' => ['required', 'date'], 'due_at' => ['nullable', 'date'], 'paid_at' => ['nullable', 'date'], 'status' => ['sometimes', 'in:pending,paid,overdue,cancelled'], 'contract_id' => ['nullable', 'integer', 'exists:contracts,id'], 'budget_unit_id' => ['nullable', 'integer', 'exists:budget_units,id']]; }
}
