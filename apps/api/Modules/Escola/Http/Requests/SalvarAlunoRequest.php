<?php

declare(strict_types=1);

namespace Modules\Escola\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Modules\Escola\Http\Requests\Concerns\RegrasDoTenant;
use Illuminate\Validation\Rule;
use Modules\Escola\Enums\SituacaoAluno;
use Modules\Escola\Models\Aluno;

final class SalvarAlunoRequest extends FormRequest
{
    use RegrasDoTenant;

    public function authorize(): bool
    {
        return $this->podeSalvar('aluno', Aluno::class);
    }

    /**
     * @return array<string, list<mixed>>
     */
    public function rules(): array
    {
        return [
            'nome' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'max:200'],
            'cpf' => ['nullable', 'string', 'max:14', function (string $atributo, mixed $valor, \Closure $falha): void {
                if ($valor !== null && $valor !== '' && !\Modules\Pessoas\Support\Documento::valido((string) $valor)) {
                    $falha('CPF inválido.');
                }
            }],
            'cgm' => ['nullable', 'string', 'max:50'],
            'numero' => ['nullable', 'integer', 'min:1', 'max:999'],
            'turma_id' => ['nullable', 'integer', $this->existeNoTenant('escola_turmas')],
            'nascimento' => ['nullable', 'date', 'before_or_equal:today'],
            'mae' => ['nullable', 'string', 'max:200'],
            'pai' => ['nullable', 'string', 'max:200'],
            'situacao' => ['sometimes', Rule::enum(SituacaoAluno::class)],
            'contatos' => ['sometimes', 'array', 'max:10'],
            'contatos.*.telefone' => ['required', 'string', 'max:30'],
            'contatos.*.descricao' => ['nullable', 'string', 'max:100'],
        ];
    }
}
