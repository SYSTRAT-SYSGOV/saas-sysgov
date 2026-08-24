<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'is_platform_admin' => ['nullable', 'boolean'],
            'tenants' => ['nullable', 'array'],
            'tenants.*.tenant_id' => ['required_with:tenants', 'integer', 'exists:tenants,id'],
            'tenants.*.role_id' => ['nullable', 'integer', 'exists:roles,id'],
        ];
    }
}
