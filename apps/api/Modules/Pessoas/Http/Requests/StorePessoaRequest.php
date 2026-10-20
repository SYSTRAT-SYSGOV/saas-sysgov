<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use App\Support\TenantContext;
use Closure;
use Illuminate\Contracts\Validation\Validator;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Http\Requests\Concerns\ValidaPessoaSemDocumento;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

final class StorePessoaRequest extends FormRequest
{
    use ValidaPessoaSemDocumento;

    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.create') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        $tipo = (string) $this->input('tipo', 'fisica');

        return [
            'tipo' => ['sometimes', Rule::in(['fisica', 'juridica'])],
            'nome' => [Rule::requiredIf($tipo === 'fisica'), 'string', 'max:255'],
            // CPF é opcional para pessoa física: sem ele a pessoa fica com documento pendente.
            'cpf' => [
                'nullable',
                'string',
                $this->regraDocumentoUnico('fisica'),
            ],
            'razao_social' => [Rule::requiredIf($tipo === 'juridica'), 'string', 'max:255'],
            'cnpj' => [
                Rule::requiredIf($tipo === 'juridica'),
                'string',
                $this->regraDocumentoUnico('juridica'),
            ],
            'nome_fantasia' => ['nullable', 'string', 'max:255'],
            'inscricao_estadual' => ['nullable', 'string', 'max:30'],
            'inscricao_municipal' => ['nullable', 'string', 'max:30'],
            'porte' => ['nullable', Rule::in(['ME', 'EPP', 'DEMAIS'])],
            'natureza_juridica' => ['nullable', 'string', 'max:100'],
            'responsavel_id' => ['nullable', $this->regraResponsavel()],
            'nome_social' => ['nullable', 'string', 'max:255'],
            'data_nascimento' => ['nullable', 'date'],
            'sexo' => ['nullable', 'string', 'max:20'],
            'nome_mae' => ['nullable', 'string', 'max:255'],
            'nome_pai' => ['nullable', 'string', 'max:255'],
            'estado_civil' => ['nullable', 'string', 'max:30'],
            'nacionalidade' => ['nullable', 'string', 'max:60'],
            'naturalidade' => ['nullable', 'string', 'max:100'],
            'nis' => ['nullable', 'string', 'max:20'],
            'status' => ['sometimes', Rule::in(['ativo', 'inativo', 'falecido'])],
            'falecido' => ['sometimes', 'boolean'],
            'data_falecimento' => [
                'nullable',
                'date',
                'before_or_equal:today',
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($this->filled('data_nascimento') && $this->filled('data_falecimento')) {
                        if (strtotime((string) $value) < strtotime((string) $this->input('data_nascimento'))) {
                            $fail('A data de falecimento não pode ser anterior à data de nascimento.');
                        }
                    }
                },
            ],
            'certidao_obito_numero' => ['nullable', 'string', 'max:50'],
            'cartorio_obito' => ['nullable', 'string', 'max:150'],
            'observacao_obito' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $semDocumento = (string) $this->input('tipo', 'fisica') === 'fisica' && ! $this->filled('cpf');
            $this->validarPessoaSemDocumento($validator, $semDocumento, $this->input('data_nascimento'), $this->input('responsavel_id'));
        });
    }

    private function regraDocumentoUnico(string $tipo): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($tipo): void {
            if (! $this->filled($attribute)) {
                return;
            }
            if (! is_string($value) || ! Documento::valido($value, $tipo)) {
                $fail($tipo === 'juridica' ? 'O CNPJ informado é inválido.' : 'O CPF informado é inválido.');

                return;
            }

            $tenantId = app(TenantContext::class)->id();
            $hash = Documento::hash($value);

            $existe = Pessoa::withTrashed()
                ->where('tenant_id', $tenantId)
                ->where('tipo', $tipo)
                ->where('documento_hash', $hash)
                ->exists();

            if ($existe) {
                $fail($tipo === 'juridica'
                    ? 'Já existe uma pessoa jurídica cadastrada com este CNPJ neste órgão.'
                    : 'Já existe uma pessoa cadastrada com este CPF neste órgão.');
            }
        };
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nome.required' => 'O nome da pessoa é obrigatório.',
            'razao_social.required' => 'A razão social é obrigatória para pessoa jurídica.',
            'cnpj.required' => 'O CNPJ é obrigatório para pessoa jurídica.',
            'responsavel_id.exists' => 'O responsável informado deve ser uma pessoa física cadastrada neste órgão.',
        ];
    }
}
