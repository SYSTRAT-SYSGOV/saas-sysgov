<?php

declare(strict_types=1);

namespace Modules\Protocolo\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class StoreTipoTramitacaoRequest extends FormRequest
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
            'slug' => [
                'required',
                'string',
                'max:64',
                'regex:/^[a-z0-9_-]+$/',
                Rule::unique('protocolo_tipos_tramitacao', 'slug')->where('tenant_id', $tenantId),
            ],
            'nome' => ['required', 'string', 'max:255'],
            'descricao' => ['nullable', 'string', 'max:1000'],
            'prazo_dias' => ['nullable', 'integer', 'min:1'],
            'efeito_status' => ['nullable', 'string', 'in:aberto,em_tramitacao,aguardando,concluido,arquivado'],
            'ativo' => ['nullable', 'boolean'],
        ];
    }
}
