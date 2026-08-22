<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['name' => ['required', 'string', 'max:160'], 'slug' => ['required', 'alpha_dash', 'max:80', 'unique:tenants,slug'], 'cnpj' => ['nullable', 'digits:14', 'unique:tenants,cnpj'], 'type' => ['required', 'in:prefeitura,parceiro,interno'], 'status' => ['sometimes', 'in:active,suspended,trial'], 'settings' => ['nullable', 'array']]; }
}