<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

final class StoreModuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('create', \Modules\Admin\Models\Module::class);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'alias' => [
                'required',
                'string',
                'max:50',
                'regex:/^[a-z0-9_]+$/',
                Rule::unique('modules', 'alias'),
            ],
            'description' => ['nullable', 'string'],
            'metadata' => ['nullable', 'array'],
            'enabled' => ['boolean'],
            'monthly_fee_cents' => ['integer', 'min:0'],
            'default_permissions' => ['nullable', 'array'],
            'default_permissions.*' => ['string'],
            'menu' => ['nullable', 'array'],
            'menu.label' => ['required_with:menu', 'string', 'max:255'],
            'menu.icon' => ['nullable', 'string', 'max:50'],
            'menu.order' => ['nullable', 'integer', 'min:1'],
        ];
    }

    public function messages(): array
    {
        return [
            'alias.regex' => 'O alias deve conter apenas letras minúsculas, números e underscore.',
            'alias.unique' => 'Já existe um módulo com este alias.',
        ];
    }
}