<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreRoleRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['name' => ['required', 'string', 'max:100'], 'tenant_id' => ['nullable', 'integer', 'exists:tenants,id'], 'permission_ids' => ['sometimes', 'array'], 'permission_ids.*' => ['integer', 'exists:permissions,id']]; }
}
