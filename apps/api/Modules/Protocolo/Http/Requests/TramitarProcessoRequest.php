<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class TramitarProcessoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = app(TenantContext::class)->id();

        return [
            'orgao_destino_id' => [
                'required',
                'integer',
                Rule::exists('org_units', 'id')->where('tenant_id', $tenantId),
            ],
            'tipo_tramitacao_id' => [
                'required',
                'integer',
                Rule::exists('protocolo_tipos_tramitacao', 'id')
                    ->where('tenant_id', $tenantId)
                    ->where('ativo', true),
            ],
            'descricao' => ['nullable', 'string', 'max:2000'],
            'prazo_dias' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
