<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateSystratUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.systrat.update') ?? false;
    }

    public function rules(): array
    {
        $userId = $this->route('user') instanceof \App\Models\User ? $this->route('user')->id : $this->route('user');

        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:160', Rule::unique('users', 'email')->ignore($userId)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'],
            'role_slug' => ['sometimes', 'string', Rule::exists('roles', 'slug')->where('scope', 'systrat')],
            'is_active' => ['sometimes', 'boolean'],
            'is_platform_admin' => ['nullable', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.regex' => 'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
            'role_slug.exists' => 'A role selecionada não existe ou não é do escopo SYSTRAT.',
        ];
    }
}