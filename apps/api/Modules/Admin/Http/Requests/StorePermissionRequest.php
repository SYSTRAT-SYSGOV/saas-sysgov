<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StorePermissionRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['name' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9.-]+$/'], 'tenant_id' => ['nullable', 'integer', 'exists:tenants,id']]; }
}
