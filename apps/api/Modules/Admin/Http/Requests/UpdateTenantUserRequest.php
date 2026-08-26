<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use App\Models\Role;
use Illuminate\Foundation\Http\FormRequest;

final class UpdateTenantUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user !== null && ($user->is_platform_admin || $user->hasRole('admin_tenant'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'email' => ['sometimes', 'email', 'max:160'],
            'role_slug' => ['sometimes', 'string', 'max:80'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function withValidator(\Illuminate\Validation\Validator $validator): void
    {
        $validator->after(function (\Illuminate\Validation\Validator $validator): void {
            $roleSlug = $this->input('role_slug');
            if (!$roleSlug) {
                return;
            }

            $tenantId = app(\App\Support\TenantContext::class)->id();
            $exists = Role::where('slug', $roleSlug)
                ->where('scope', 'tenant')
                ->where('tenant_id', $tenantId)
                ->exists();

            $isValidTenantRole = $exists || Role::where('slug', $roleSlug)->where('scope', 'tenant')->exists();

            if (!$isValidTenantRole) {
                $validator->errors()->add('role_slug', 'A role informada não existe no tenant ativo.');
            }
        });
    }
}
