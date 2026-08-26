<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('roles.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'slug' => ['required', 'string', 'max:100', 'unique:roles,slug'],
            'scope' => ['required', 'string', Rule::in(['systrat', 'tenant'])],
            'description' => ['nullable', 'string'],
            'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'],
            'permission_ids' => ['sometimes', 'array'],
            'permission_ids.*' => ['integer', 'exists:permissions,id'],
            'is_system' => ['nullable', 'boolean'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->scope === 'tenant' && !$this->tenant_id) {
                $validator->errors()->add('tenant_id', 'Roles do escopo tenant requerem um tenant_id.');
            }
            if ($this->scope === 'systrat' && $this->tenant_id) {
                $validator->errors()->add('tenant_id', 'Roles do escopo SYSTRAT não podem ter tenant_id.');
            }
        });
    }

    public function messages(): array
    {
        return [
            'slug.unique' => 'Este slug já está em uso.',
            'scope.in' => 'O escopo deve ser "systrat" ou "tenant".',
        ];
    }
}