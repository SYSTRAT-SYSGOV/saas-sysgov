<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateTenantAdminRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user?->is_platform_admin || $user?->hasPermission('users.tenant.create') ?? false;
    }

    public function rules(): array
    {
        // Nome e senha só são obrigatórios para um usuário novo; para um e-mail já cadastrado o
        // usuário é reaproveitado e nome/senha atuais são preservados.
        $newUser = fn (): bool => !User::where('email', (string) $this->input('email'))->exists();

        return [
            'name' => [Rule::requiredIf($newUser), 'nullable', 'string', 'max:160'],
            'email' => ['required', 'email', 'max:160', $this->emailRule()],
            'password' => [Rule::requiredIf($newUser), 'nullable', 'string', 'min:8', 'confirmed', 'regex:/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/'],
        ];
    }

    /**
     * Um e-mail já cadastrado pode virar administrador de outro tenant (o usuário é reaproveitado),
     * exceto contas da plataforma/SYSTRAT ou desativadas. A duplicidade no mesmo tenant vira 409 no controller.
     */
    private function emailRule(): \Closure
    {
        return function (string $attribute, mixed $value, $fail): void {
            $existing = User::where('email', $value)->first();

            if ($existing && ($existing->is_platform_admin || $existing->is_systrat)) {
                $fail('Este e-mail pertence a uma conta da plataforma e não pode ser administrador de tenant.');
            } elseif ($existing && !$existing->is_active) {
                $fail('Este e-mail pertence a uma conta desativada.');
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