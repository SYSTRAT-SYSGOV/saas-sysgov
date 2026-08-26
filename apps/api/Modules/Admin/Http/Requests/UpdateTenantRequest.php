<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool
    {
        $user = $this->user();
        return $user !== null && ($user->is_platform_admin || $user->hasRole('admin_ops'));
    }

    public function rules(): array
    {
        $tenantId = $this->route('tenant') instanceof \App\Models\Tenant ? $this->route('tenant')->id : $this->route('tenant');

        return [
            'name' => ['sometimes', 'string', 'max:160'],
            'cnpj' => ['sometimes', 'nullable', 'digits:14', 'unique:tenants,cnpj,'.$tenantId],
            'type' => ['sometimes', 'in:prefeitura,camara,autarquia,parceiro,interno'],
            'status' => ['sometimes', 'in:active,suspended,trial'],
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
            'modules' => ['sometimes', 'array'],
            'modules.*' => ['string', 'max:60'],
            'settings' => ['sometimes', 'array', 'max:20'],
            'settings.customPrimaryColor' => ['sometimes', 'string', 'max:30'],
            'settings.customLogoUrl' => ['sometimes', 'url', 'max:500'],
            'settings.portalTitle' => ['sometimes', 'string', 'max:120'],
            'settings.portalSubtitle' => ['sometimes', 'string', 'max:240'],
            'settings.hideProviderSignature' => ['sometimes', 'boolean'],
        ];
    }
}
