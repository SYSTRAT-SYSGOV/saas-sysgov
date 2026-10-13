<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class PromoverRequerimentoRequest extends FormRequest
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
            'requerimento_id' => ['required', 'integer', 'min:1'],
            'assunto' => ['nullable', 'string', 'max:500'],
            'orgao_destino_id' => [
                'required',
                'integer',
                Rule::exists('org_units', 'id')->where('tenant_id', $tenantId),
            ],
            'interessado_pessoa_id' => [
                'nullable',
                'integer',
                Rule::exists('pessoas', 'id')->where('tenant_id', $tenantId),
            ],
            'atributos' => ['nullable', 'array'],
            'andamento_inicial' => ['nullable', 'array'],
        ];
    }
}
