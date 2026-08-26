<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

final class CreateTenantAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user?->is_platform_admin || $user?->hasPermission('users.tenant.create') ?? false;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', $this->emailRule()],
            'password' => ['required', 'string', 'min:8', 'confirmed', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'],
        ];
    }

    /**
     * E-mail deve ser único, mas permite o mesmo e-mail de um admin_tenant ativo do MESMO tenant
     * (onboarding idempotente — RN-USR-011; o controller devolve 409 nesse caso)
     */
    private function emailRule(): \Closure
    {
        return function (string $attribute, mixed $value, $fail): void {
            $existing = User::where('email', $value)->first();

            if (!$existing) {
                return;
            }

            $tenant = Tenant::find($this->route('tenant'));

            $isSameTenantAdmin = $tenant !== null
                && $existing->tenants()->where('tenants.id', $tenant->id)->wherePivot('status', 'active')->exists()
                && $existing->roles()->where('slug', 'admin_tenant')->exists();

            if (!$isSameTenantAdmin) {
                $fail('Este e-mail já está em uso.');
            }
        };
    }

    public function messages(): array
    {
        return [
            'password.regex' => 'A senha deve ter no mínimo 8 caracteres, incluindo maiúscula, minúscula, número e símbolo.',
        ];
    }
}