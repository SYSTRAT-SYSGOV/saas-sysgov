<?php

declare(strict_types=1);

namespace Modules\Formatura\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Modules\Escola\Models\Turma;
use Modules\Formatura\Enums\FormaPagamento;
use Modules\Formatura\Enums\TipoCalculo;
use Modules\Formatura\Models\Configuracao;

final class SalvarConfiguracaoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->user()?->can('create', Configuracao::class) === true;
    }

    /**
     * Valores monetários só como inteiros em centavos (design D7): 150.5 é rejeitado.
     *
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
            'titulo' => ['required', 'string', 'max:200'],
            'tipo_calculo' => ['required', Rule::enum(TipoCalculo::class)],
            'valor_base_centavos' => ['required', 'integer', 'min:0'],
            'valor_pessoa_extra_centavos' => ['sometimes', 'integer', 'min:0'],
            'convidados_incluidos_padrao' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'max_parcelas' => ['required', 'integer', 'min:1', 'max:24'],
            'chaves_pix' => ['sometimes', 'array', 'max:5'],
            'chaves_pix.*' => ['string', 'max:150'],
            'formas_pagamento' => ['required', 'array', 'min:1'],
            'formas_pagamento.*' => ['distinct', Rule::enum(FormaPagamento::class)],
            'turmas_ids' => ['sometimes', 'array', 'max:50'],
            'turmas_ids.*' => ['integer', 'distinct', $this->existeNoTenant('escola_turmas')],
        ];
    }

    /** Turma formanda precisa ser do mesmo ano letivo da configuração. */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $v): void {
            $ids = $this->input('turmas_ids', []);
            if ($v->errors()->isNotEmpty() || !is_array($ids) || $ids === []) {
                return;
            }
            $deOutroAno = Turma::query()->whereIn('id', $ids)->where('ano_letivo', '!=', (int) $this->input('ano_letivo'))->exists();
            if ($deOutroAno) {
                $v->errors()->add('turmas_ids', 'As turmas formandas devem ser do mesmo ano letivo da formatura.');
            }
        });
    }
}
