<?php

declare(strict_types=1);

namespace Modules\Admin\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateTenantRequest extends FormRequest
{
    public function authorize(): bool { return (bool) $this->user()?->is_platform_admin; }
    public function rules(): array { return ['name' => ['sometimes', 'string', 'max:160'], 'cnpj' => ['sometimes', 'nullable', 'digits:14', 'unique:tenants,cnpj,'.$this->route('tenant')?->id], 'type' => ['sometimes', 'in:prefeitura,parceiro,interno'], 'status' => ['sometimes', 'in:active,suspended,trial'], 'settings' => ['sometimes', 'array', 'max:20'], 'settings.customPrimaryColor' => ['sometimes', 'string', 'max:30'], 'settings.customLogoUrl' => ['sometimes', 'url', 'max:500'], 'settings.portalTitle' => ['sometimes', 'string', 'max:120'], 'settings.portalSubtitle' => ['sometimes', 'string', 'max:240'], 'settings.hideProviderSignature' => ['sometimes', 'boolean']]; }
}
