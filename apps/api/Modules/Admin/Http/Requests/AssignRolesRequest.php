<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class AssignRolesRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['tenant_id' => ['required', 'integer', 'exists:tenants,id'], 'role_ids' => ['array'], 'role_ids.*' => ['integer', 'exists:roles,id']]; }
}
