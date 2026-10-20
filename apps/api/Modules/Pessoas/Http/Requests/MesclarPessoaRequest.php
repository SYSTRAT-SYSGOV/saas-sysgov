<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use App\Support\TenantContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class MesclarPessoaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.merge') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'destino_id' => [
                'required',
                'integer',
                Rule::exists('pessoas', 'id')
                    ->where('tenant_id', app(TenantContext::class)->id())
                    ->where('tipo', 'fisica')
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'destino_id.required' => 'Informe a pessoa que será mantida.',
            'destino_id.exists' => 'A pessoa a manter deve ser uma pessoa física cadastrada neste órgão.',
        ];
    }
}
