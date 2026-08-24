<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreMenuItemRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'tenant_id' => ['nullable', 'exists:tenants,id'],
            'menu_group_id' => ['required', 'exists:menu_groups,id'],
            'label' => ['required', 'string', 'max:120'],
            'icon' => ['nullable', 'string', 'max:80'],
            'route' => ['nullable', 'string', 'max:200'],
            'permission' => ['nullable', 'string', 'max:120'],
            'shortcut' => ['nullable', 'string', 'max:20'],
            'module_alias' => ['nullable', 'string', 'max:80'],
            'order' => ['nullable', 'integer'],
            'is_active' => ['nullable', 'boolean'],
        ];
    }
}
