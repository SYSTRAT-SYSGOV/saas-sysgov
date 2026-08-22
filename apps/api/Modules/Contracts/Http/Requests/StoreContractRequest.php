<?php

declare(strict_types=1);

namespace Modules\Contracts\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreContractRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('create', \Modules\Contracts\Models\Contract::class) === true; }
    public function rules(): array { return ['number' => ['required', 'string', 'max:60'], 'title' => ['required', 'string', 'max:200'], 'starts_at' => ['required', 'date'], 'ends_at' => ['required', 'date', 'after_or_equal:starts_at'], 'amount_cents' => ['required', 'integer', 'min:0'], 'status' => ['sometimes', 'in:draft,active,suspended,ended']]; }
}
