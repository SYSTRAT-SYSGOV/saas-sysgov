<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class InviteUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.invite') ?? false;
    }

    public function rules(): array
    {
        return [
            'email' => ['required', 'email', 'max:160'],
            'role_slug' => ['required', 'string', Rule::exists('roles', 'slug')],
            'tenant_id' => ['nullable', 'integer', Rule::exists('tenants', 'id')],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if ($this->filled('tenant_id') && $this->filled('role_slug')) {
                $role = \App\Models\Role::where('slug', $this->role_slug)->first();
                if ($role && $role->scope === 'systrat' && $this->tenant_id) {
                    $validator->errors()->add('role_slug', 'Roles do escopo SYSTRAT não podem ser atribuídas a um tenant específico.');
                }
                if ($role && $role->scope === 'tenant' && !$this->tenant_id) {
                    $validator->errors()->add('tenant_id', 'Roles do escopo tenant requerem um tenant_id.');
                }
            }
        });
    }

    public function messages(): array
    {
        return [
            'role_slug.exists' => 'A role selecionada não existe.',
            'tenant_id.exists' => 'O tenant informado não existe.',
        ];
    }
}