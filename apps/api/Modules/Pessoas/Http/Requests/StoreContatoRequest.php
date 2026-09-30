<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\PessoaContato;

final class StoreContatoRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'tipo' => ['required', Rule::in(PessoaContato::TIPOS)],
            'valor' => [
                'required',
                'string',
                'max:255',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($this->input('tipo') === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
                        $fail('O endereço de e-mail informado é inválido.');
                    }
                },
            ],
            'principal' => ['sometimes', 'boolean'],
            'autoriza_notificacoes' => ['sometimes', 'boolean'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'tipo.required' => 'O tipo do contato é obrigatório (celular, email ou telefone).',
            'tipo.in' => 'Tipo de contato inválido.',
            'valor.required' => 'O valor do contato é obrigatório.',
        ];
    }
}
