<?php

declare(strict_types=1);

namespace Modules\Pessoas\Http\Requests;

use App\Support\TenantContext;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Modules\Pessoas\Models\Pessoa;
use Modules\Pessoas\Support\Documento;

final class UpdatePessoaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->hasPermission('cadastros.pessoas.update') === true;
    }

    /** @return array<string, array<int, mixed>> */
    public function rules(): array
    {
        /** @var Pessoa|int|string|null $routePessoa */
        $routePessoa = $this->route('pessoa');
        $pessoaId = $routePessoa instanceof Pessoa ? $routePessoa->id : (int) $routePessoa;

        return [
            'nome' => ['sometimes', 'string', 'max:255'],
            'cpf' => [
                'sometimes',
                'string',
                function (string $attribute, mixed $value, Closure $fail) use ($pessoaId): void {
                    if (! is_string($value) || ! Documento::valido($value)) {
                        $fail('O CPF informado é inválido.');

                        return;
                    }

                    $tenantId = app(TenantContext::class)->id();
                    $hash = Documento::hash($value);

                    $existe = Pessoa::withTrashed()
                        ->where('tenant_id', $tenantId)
                        ->where('cpf_hash', $hash)
                        ->where('id', '!=', $pessoaId)
                        ->exists();

                    if ($existe) {
                        $fail('Já existe outra pessoa cadastrada com este CPF neste órgão.');
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
            'status' => ['sometimes', Rule::in(['ativo', 'inativo', 'falecido'])],
            'falecido' => ['sometimes', 'boolean'],
            'data_falecimento' => [
                'nullable',
                'date',
                'before_or_equal:today',
                function (string $attribute, mixed $value, Closure $fail) use ($routePessoa): void {
                    $dtNascimento = $this->input('data_nascimento');
                    if (! $dtNascimento && $routePessoa instanceof Pessoa) {
                        $dtNascimento = $routePessoa->data_nascimento?->format('Y-m-d');
                    }
                    if ($dtNascimento && $value) {
                        if (strtotime((string) $value) < strtotime((string) $dtNascimento)) {
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
}
