<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user !== null && ($user->is_platform_admin || $user->hasRole('admin_ops'));
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:160'],
            'slug' => ['required', 'alpha_dash', 'max:80', 'unique:tenants,slug'],
            'cnpj' => ['nullable', 'digits:14', 'unique:tenants,cnpj'],
            'type' => ['required', Rule::in(['prefeitura', 'camara', 'autarquia', 'parceiro', 'interno'])],
            'status' => ['sometimes', Rule::in(['active', 'suspended', 'trial'])],
            'plan' => ['sometimes', 'string', 'max:40'],
            'domain' => ['nullable', 'string', 'max:160'],
            'max_users' => ['sometimes', 'integer', 'min:1', 'max:100000'],
            'storage_limit_mb' => ['sometimes', 'integer', 'min:1', 'max:1048576'],
            'monthly_fee_cents' => ['sometimes', 'integer', 'min:0'],
            'setup_fee_cents' => ['sometimes', 'integer', 'min:0'],
            'custom_domain_enabled' => ['sometimes', 'boolean'],
            'custom_domain_fee_cents' => ['sometimes', 'integer', 'min:0'],
            'city' => ['nullable', 'string', 'max:120'],
            'uf' => ['nullable', 'string', 'size:2'],
            'cnae' => ['nullable', 'string', 'max:20'],
            'website' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email', 'max:160'],
            'modules' => ['sometimes', 'array'],
            'modules.*' => ['string', 'max:60'],
            'settings' => ['nullable', 'array'],
        ];
    }
}
