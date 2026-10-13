<?php

declare(strict_types=1);

namespace Modules\Formatura\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Formatura\Models\Participacao;

final class SalvarParticipacaoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('create', Participacao::class) === true;
    }

    /** @return array<string, list<mixed>> */
    public function rules(): array
    {
        return [
            'ano_letivo' => ['required', 'integer', 'min:2020', 'max:2100'],
            'participa' => ['required', 'boolean'],
            'convidados' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'convidados_incluidos' => ['sometimes', 'integer', 'min:0', 'max:20'],
            'convidados_extras' => ['sometimes', 'integer', 'min:0', 'max:50'],
            'observacoes' => ['nullable', 'string', 'max:1000'],
            'telefone' => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
