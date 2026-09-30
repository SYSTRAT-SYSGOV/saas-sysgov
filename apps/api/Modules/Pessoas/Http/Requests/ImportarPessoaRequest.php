<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Modules\Pessoas\Support\Documento;

final class ImportarPessoaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.import') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'documento' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || ! Documento::valido($value)) {
                        $fail('O documento (CPF) informado para importação é inválido.');
                    }
                },
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'documento.required' => 'O documento (CPF) é obrigatório para importação.',
        ];
    }
}
