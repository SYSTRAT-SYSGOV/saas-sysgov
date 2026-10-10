<?php

declare(strict_types=1);

namespace Modules\Formatura\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Formatura\Enums\FormaPagamento;
use Modules\Formatura\Models\Pagamento;

final class RegistrarPagamentoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Pagamento::class) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
            'aluno_id' => ['required', 'integer', $this->existeNoTenant('escola_alunos')],
            'numero_parcela' => ['required', 'integer', 'min:1', 'max:24'],
            'data_pagamento' => ['required', 'date_format:Y-m-d', 'before_or_equal:today'],
            'valor_centavos' => ['required', 'integer', 'min:1'],
            'forma_pagamento' => ['required', Rule::enum(FormaPagamento::class)],
            'chave_pix' => ['nullable', 'required_if:forma_pagamento,pix', 'string', 'max:150'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ];
    }
}
