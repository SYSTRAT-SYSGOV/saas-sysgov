<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class BatchModuleProvisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->is_platform_admin;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'tenant_ids' => ['required', 'array', 'min:1'],
            'tenant_ids.*' => ['integer', 'exists:tenants,id'],
            'module_alias' => ['required', 'string', 'exists:modules,alias'],
            'enabled' => ['required', 'boolean'],
            'monthly_fee_cents' => ['nullable', 'integer', 'min:0'],
            'trial_ends_at' => ['nullable', 'date', 'after:today'],
            'settings' => ['nullable', 'array'],
        ];
    }

    public function messages(): array
    {
        return [
            'tenant_ids.required' => 'Selecione ao menos um tenant.',
            'tenant_ids.*.exists' => 'Um ou mais tenants não existem.',
            'module_alias.exists' => 'O módulo especificado não existe no catálogo.',
        ];
    }
}