<?php

declare(strict_types=1);

namespace Modules\Contracts\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateContractRequest extends FormRequest
{
    public function authorize(): bool { return $this->user()?->can('update', $this->route('contract')) === true; }
    public function rules(): array { return ['title' => ['sometimes', 'string', 'max:200'], 'starts_at' => ['sometimes', 'date'], 'ends_at' => ['sometimes', 'date'], 'amount_cents' => ['sometimes', 'integer', 'min:0'], 'status' => ['sometimes', 'in:draft,active,suspended,ended']]; }
}
