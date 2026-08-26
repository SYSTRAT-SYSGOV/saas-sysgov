<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class LoginRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array { return ['email' => ['required', 'email'], 'password' => ['required', 'string'], 'tenant_slug' => ['nullable', 'alpha_dash', 'exists:tenants,slug'], 'mfa_code' => ['nullable', 'string', 'size:6']]; }
}
