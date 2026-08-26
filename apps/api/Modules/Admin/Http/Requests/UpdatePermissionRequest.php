<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdatePermissionRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }

    public function rules(): array
    {
        $permissionId = $this->route('permission') instanceof \App\Models\Permission ? $this->route('permission')->id : $this->route('permission');
        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'slug' => ['sometimes', 'string', 'max:160', 'unique:permissions,slug,'.$permissionId, 'regex:/^[a-z0-9.-]+$/'],
            'module' => ['sometimes', 'string', 'max:100'],
        ];
    }
}