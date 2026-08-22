<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreHierarchyNodeRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['tenant_id' => ['required', 'integer', 'exists:tenants,id'], 'parent_id' => ['nullable', 'integer', 'min:1'], 'name' => ['required', 'string', 'max:160'], 'code' => ['required', 'string', 'max:30', 'alpha_dash']]; }
}
