<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use App\Support\TenantContext;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

final class StorePessoaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.create') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        return [
            'nome' => ['required', 'string', 'max:255'],
            'cpf' => [
                'required',
                'string',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if (! is_string($value) || ! Documento::valido($value)) {
                        $fail('O CPF informado é inválido.');

                        return;
                    }

                    $tenantId = app(TenantContext::class)->id();
                    $hash = Documento::hash($value);

                    $existe = Pessoa::withTrashed()
                        ->where('tenant_id', $tenantId)
                        ->where('cpf_hash', $hash)
                        ->exists();

                    if ($existe) {
                        $fail('Já existe uma pessoa cadastrada com este CPF neste órgão.');
                    }
                },
            ],
            'nome_social' => ['nullable', 'string', 'max:255'],
            'data_nascimento' => ['nullable', 'date'],
            'sexo' => ['nullable', 'string', 'max:20'],
            'nome_mae' => ['nullable', 'string', 'max:255'],
            'nome_pai' => ['nullable', 'string', 'max:255'],
            'estado_civil' => ['nullable', 'string', 'max:30'],
            'nacionalidade' => ['nullable', 'string', 'max:60'],
            'naturalidade' => ['nullable', 'string', 'max:100'],
            'nis' => ['nullable', 'string', 'max:20'],
            'status' => ['sometimes', Rule::in(['ativo', 'inativo'])],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nome.required' => 'O nome da pessoa é obrigatório.',
            'cpf.required' => 'O CPF é obrigatório.',
        ];
    }
}
