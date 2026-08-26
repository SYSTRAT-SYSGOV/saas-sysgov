<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreSystratUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('users.systrat.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'],
            'role_slug' => ['required', 'string', Rule::exists('roles', 'slug')->where('scope', 'systrat')],
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